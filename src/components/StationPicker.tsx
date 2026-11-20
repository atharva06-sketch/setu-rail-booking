import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { getStation, searchStations, type StationInfo } from "@/lib/stations";
import { BLUE_DARK, FONT_BODY, GREEN, LINE, MUTED, RED, TEXT } from "@/theme";

interface StationPickerProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
  id?: string;
  placeholder?: string;
}

export default function StationPicker({
  label,
  value,
  onChange,
  error,
  id = "station",
  placeholder = "Search station name or code",
}: StationPickerProps) {
  const selected = getStation(value);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchStations(query, 9), [query]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
        setDirty(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${id}-option-${active}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  const display = dirty
    ? query
    : selected
      ? `${selected.name} (${selected.code})`
      : "";

  function close() {
    setOpen(false);
    setDirty(false);
    setQuery("");
  }

  function commit(station: StationInfo) {
    onChange(station.code);
    close();
    inputRef.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        event.preventDefault();
        setOpen(true);
        setDirty(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[active]) commit(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
      inputRef.current?.blur();
    } else if (event.key === "Tab") {
      close();
    }
  }

  return (
    <div className="station-wrap" ref={wrapRef}>
      <label htmlFor={id} style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <MapPin
          size={15}
          color={BLUE_DARK}
          style={{ position: "absolute", left: 10, top: 13, pointerEvents: "none" }}
        />
        <input
          ref={inputRef}
          id={id}
          className="field"
          style={{
            paddingLeft: 32,
            paddingRight: 30,
            borderColor: error ? RED : undefined,
            fontFamily: FONT_BODY,
          }}
          value={display}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          onFocus={(event) => {
            setOpen(true);
            setDirty(false);
            setQuery("");
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setDirty(true);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown
          size={15}
          color={MUTED}
          style={{ position: "absolute", right: 10, top: 13, pointerEvents: "none" }}
        />
      </div>

      {open && (
        <div className="station-dropdown" id={`${id}-listbox`} role="listbox">
          {results.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, color: MUTED }}>
              No station matches “{query}”. Try a station code like NDLS.
            </div>
          )}

          {results.map((station, index) => {
            const isSelected = station.code === value;
            return (
              <div
                key={station.code}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`station-option${index === active ? " active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(station);
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: TEXT,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {station.name}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>{station.code}</div>
                </div>
                {isSelected ? (
                  <Check size={15} color={GREEN} style={{ flex: "0 0 auto" }} />
                ) : (
                  <span className="station-code">{station.code}</span>
                )}
              </div>
            );
          })}

          {!query && (
            <div
              style={{
                fontSize: 10,
                color: "#9AAAB8",
                padding: "6px 10px",
                borderTop: `1px solid ${LINE}`,
                marginTop: 4,
              }}
            >
              Popular stations · type to search all 8,670 Indian Railways stations
            </div>
          )}
        </div>
      )}

      {error && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
