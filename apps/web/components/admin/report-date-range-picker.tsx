"use client";

import type { DateValue } from "@internationalized/date";
import {
  DateField,
  DateRangePicker,
  I18nProvider,
  Label,
  RangeCalendar,
  type RangeValue,
} from "@heroui/react";

import { DATE_INPUT_LOCALE } from "@/lib/date-range-field";

export function ReportDateRangePicker({
  value,
  onChange,
  className = "min-w-[260px] flex-1 basis-[280px] sm:max-w-[360px]",
  calendarAriaLabel = "Date range",
}: {
  value: RangeValue<DateValue> | null;
  onChange: (range: RangeValue<DateValue> | null) => void;
  className?: string;
  calendarAriaLabel?: string;
}) {
  return (
    <I18nProvider locale={DATE_INPUT_LOCALE}>
      <DateRangePicker
        className={className}
        endName="dateTo"
        shouldForceLeadingZeros
        startName="dateFrom"
        value={value}
        onChange={onChange}
      >
        <Label>Date range</Label>
        <DateField.Group
          fullWidth
          className="bg-white dark:bg-surface"
          variant="secondary"
        >
          <DateField.Input slot="start">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateRangePicker.RangeSeparator />
          <DateField.Input slot="end">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DateRangePicker.Trigger>
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DateRangePicker.Popover className="bg-white dark:bg-surface">
          <RangeCalendar
            aria-label={calendarAriaLabel}
            className="bg-white dark:bg-surface"
          >
            <RangeCalendar.Header>
              <RangeCalendar.YearPickerTrigger>
                <RangeCalendar.YearPickerTriggerHeading />
                <RangeCalendar.YearPickerTriggerIndicator />
              </RangeCalendar.YearPickerTrigger>
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {(day) => (
                  <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                )}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>
                {(date) => <RangeCalendar.Cell date={date} />}
              </RangeCalendar.GridBody>
            </RangeCalendar.Grid>
            <RangeCalendar.YearPickerGrid>
              <RangeCalendar.YearPickerGridBody>
                {({ year }) => (
                  <RangeCalendar.YearPickerCell year={year} />
                )}
              </RangeCalendar.YearPickerGridBody>
            </RangeCalendar.YearPickerGrid>
          </RangeCalendar>
        </DateRangePicker.Popover>
      </DateRangePicker>
    </I18nProvider>
  );
}
