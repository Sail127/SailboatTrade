"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSearchScore(label, query) {
  const haystack = normalizeSearchText(label);
  const needle = normalizeSearchText(query);
  if (!needle) return 0;
  if (haystack === needle) return 3;
  if (haystack.startsWith(needle)) return 2;
  if (haystack.includes(needle)) return 1;
  return -1;
}

function centerNode(container, node) {
  if (!container || !node) return;
  const nextTop = node.offsetTop - container.clientHeight / 2 + node.offsetHeight / 2;
  container.scrollTop = Math.max(0, nextTop);
}

export function SearchableSingleSelect({
  detailsRef,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  summaryClassName,
  panelClassName,
  inputClassName,
  rowClassName,
  anchorValue = "",
  maxLength,
  inputMode = "text",
  pattern,
  transformInput = null,
  getOptionLabel = (option) => String(option || ""),
  getOptionValue = (option) => String(option || ""),
}) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const scrollBoxRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef(new Map());

  const selectedOption = useMemo(
    () => options.find((option) => String(getOptionValue(option)) === String(value || "")) ?? null,
    [getOptionValue, options, value],
  );
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : "";
  const normalizedQuery = normalizeSearchText(query);

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options
      .map((option, index) => ({
        option,
        index,
        score: getSearchScore(getOptionLabel(option), normalizedQuery),
      }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.option);
  }, [getOptionLabel, normalizedQuery, options]);

  useEffect(() => {
    if (!filteredOptions.length) {
      setHighlightedIndex(0);
      return;
    }
    setHighlightedIndex((current) => Math.min(current, filteredOptions.length - 1));
  }, [filteredOptions]);

  useEffect(() => {
    if (!detailsRef?.current?.open) return;
    const highlightedOption = filteredOptions[highlightedIndex];
    const optionValue = highlightedOption ? String(getOptionValue(highlightedOption)) : "";
    if (!optionValue) return;
    centerNode(scrollBoxRef.current, optionRefs.current.get(optionValue));
  }, [detailsRef, filteredOptions, getOptionValue, highlightedIndex]);

  const highlightedOption = filteredOptions[highlightedIndex] ?? filteredOptions[0] ?? null;

  const chooseValue = (nextValue) => {
    const normalizedValue = String(nextValue || "");
    onChange(normalizedValue);
    const matching = options.find((option) => String(getOptionValue(option)) === normalizedValue) ?? null;
    setQuery(matching ? getOptionLabel(matching) : "");
    detailsRef?.current?.removeAttribute?.("open");
  };

  const handleToggle = (event) => {
    if (!event.currentTarget.open) {
      setQuery(selectedLabel);
      setHighlightedIndex(0);
      return;
    }

    setQuery(selectedLabel);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();

      const targetValue = String(value || anchorValue || "");
      if (targetValue) {
        centerNode(scrollBoxRef.current, optionRefs.current.get(targetValue));
        const targetIndex = filteredOptions.findIndex((option) => String(getOptionValue(option)) === targetValue);
        setHighlightedIndex(targetIndex >= 0 ? targetIndex : 0);
      } else {
        setHighlightedIndex(0);
      }
    });
  };

  const handleInputChange = (event) => {
    let nextValue = event.target.value;
    if (typeof transformInput === "function") nextValue = transformInput(nextValue);
    if (typeof maxLength === "number") nextValue = nextValue.slice(0, maxLength);
    setQuery(nextValue);
    setHighlightedIndex(0);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!highlightedOption) return;
      chooseValue(getOptionValue(highlightedOption));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      detailsRef?.current?.removeAttribute?.("open");
    }
  };

  return (
    <details className="group relative" ref={detailsRef} onToggle={handleToggle}>
      <summary
        className={`${summaryClassName} list-none cursor-pointer select-none flex items-center justify-between [&::-webkit-details-marker]:hidden`}
        aria-label={ariaLabel}
      >
        <span>{selectedLabel || placeholder}</span>
        <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className={panelClassName}>
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          pattern={pattern}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          aria-label={`${ariaLabel} value`}
        />
        <div ref={scrollBoxRef} className="mt-2 max-h-52 overflow-y-auto space-y-1">
          <button
            type="button"
            onClick={() => chooseValue("")}
            className={rowClassName(!value)}
          >
            {placeholder}
          </button>
          {filteredOptions.map((option, index) => {
            const optionValue = String(getOptionValue(option));
            const isSelected = String(value || "") === optionValue;
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={`${ariaLabel}-${optionValue}`}
                type="button"
                ref={(node) => {
                  if (node) optionRefs.current.set(optionValue, node);
                  else optionRefs.current.delete(optionValue);
                }}
                onClick={() => chooseValue(optionValue)}
                className={rowClassName(isSelected, isHighlighted)}
              >
                {getOptionLabel(option)}
              </button>
            );
          })}
          {!filteredOptions.length ? <p className="px-2 py-2 text-sm text-slate-500">No matches found.</p> : null}
        </div>
      </div>
    </details>
  );
}

export function SearchableMultiSelect({
  detailsRef,
  values,
  onToggle,
  options,
  placeholder,
  ariaLabel,
  summaryText,
  summaryClassName,
  panelClassName,
  inputClassName,
  rowClassName,
  getOptionLabel = (option) => String(option?.label || option || ""),
  getOptionValue = (option) => String(option?.value || option || ""),
}) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const scrollBoxRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef(new Map());

  const normalizedQuery = normalizeSearchText(query);

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options
      .map((option, index) => ({
        option,
        index,
        score: getSearchScore(getOptionLabel(option), normalizedQuery),
      }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.option);
  }, [getOptionLabel, normalizedQuery, options]);

  useEffect(() => {
    if (!filteredOptions.length) {
      setHighlightedIndex(0);
      return;
    }
    setHighlightedIndex((current) => Math.min(current, filteredOptions.length - 1));
  }, [filteredOptions]);

  useEffect(() => {
    if (!detailsRef?.current?.open) return;
    const highlightedOption = filteredOptions[highlightedIndex];
    const optionValue = highlightedOption ? String(getOptionValue(highlightedOption)) : "";
    if (!optionValue) return;
    centerNode(scrollBoxRef.current, optionRefs.current.get(optionValue));
  }, [detailsRef, filteredOptions, getOptionValue, highlightedIndex]);

  const highlightedOption = filteredOptions[highlightedIndex] ?? filteredOptions[0] ?? null;

  const chooseValue = (nextValue) => {
    onToggle(nextValue);
    setQuery("");
    setHighlightedIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleToggle = (event) => {
    if (!event.currentTarget.open) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const selectedFirst = options.find((option) =>
        values.some((value) => normalizeSearchText(value) === normalizeSearchText(getOptionValue(option)))
      );
      const targetValue = selectedFirst ? String(getOptionValue(selectedFirst)) : String(getOptionValue(filteredOptions[0] || ""));
      if (!targetValue) return;
      centerNode(scrollBoxRef.current, optionRefs.current.get(targetValue));
      const targetIndex = filteredOptions.findIndex((option) => String(getOptionValue(option)) === targetValue);
      setHighlightedIndex(targetIndex >= 0 ? targetIndex : 0);
    });
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!highlightedOption) return;
      chooseValue(getOptionValue(highlightedOption));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      detailsRef?.current?.removeAttribute?.("open");
    }
  };

  return (
    <details className="group relative" ref={detailsRef} onToggle={handleToggle}>
      <summary
        className={`${summaryClassName} list-none cursor-pointer select-none flex items-center justify-between [&::-webkit-details-marker]:hidden`}
        aria-label={ariaLabel}
      >
        <span>{summaryText}</span>
        <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className={panelClassName}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={`Type to search ${placeholder.toLowerCase()}`}
          className={inputClassName}
          aria-label={`${ariaLabel} search`}
        />
        <div ref={scrollBoxRef} className="mt-2 max-h-52 overflow-y-auto space-y-1">
          {filteredOptions.map((option, index) => {
            const optionValue = String(getOptionValue(option));
            const isActive = values.some((value) => normalizeSearchText(value) === normalizeSearchText(optionValue));
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={`${ariaLabel}-${optionValue}`}
                type="button"
                ref={(node) => {
                  if (node) optionRefs.current.set(optionValue, node);
                  else optionRefs.current.delete(optionValue);
                }}
                onClick={() => chooseValue(optionValue)}
                aria-pressed={isActive}
                className={rowClassName(isActive, isHighlighted)}
              >
                {getOptionLabel(option)}
              </button>
            );
          })}
          {!filteredOptions.length ? <p className="px-2 py-2 text-sm text-slate-500">No matches found.</p> : null}
        </div>
      </div>
    </details>
  );
}
