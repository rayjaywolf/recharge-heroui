import { Alert, Input, Label, TextField } from "@heroui/react";

export type MarginFields = {
  providerMargin: string;
  adminMargin: string;
  distributorMargin: string;
  retailerMargin: string;
};

export const EMPTY_MARGINS: MarginFields = {
  providerMargin: "0",
  adminMargin: "0",
  distributorMargin: "0",
  retailerMargin: "0",
};

export function parseMargins(fields: MarginFields) {
  return {
    providerMargin: parseFloat(fields.providerMargin) || 0,
    adminMargin: parseFloat(fields.adminMargin) || 0,
    distributorMargin: parseFloat(fields.distributorMargin) || 0,
    retailerMargin: parseFloat(fields.retailerMargin) || 0,
  };
}

export function marginsToFields(margins: {
  providerMargin: number;
  adminMargin: number;
  distributorMargin: number;
  retailerMargin: number;
}): MarginFields {
  return {
    providerMargin: margins.providerMargin.toString(),
    adminMargin: margins.adminMargin.toString(),
    distributorMargin: margins.distributorMargin.toString(),
    retailerMargin: margins.retailerMargin.toString(),
  };
}

export function marginsMismatch(fields: MarginFields): boolean {
  const p = parseFloat(fields.providerMargin) || 0;
  const sum =
    (parseFloat(fields.adminMargin) || 0) +
    (parseFloat(fields.distributorMargin) || 0) +
    (parseFloat(fields.retailerMargin) || 0);
  return Math.abs(p - sum) > 0.001;
}

export function CommissionMarginFields({
  fields,
  onChange,
  idPrefix,
}: {
  fields: MarginFields;
  onChange: (next: MarginFields) => void;
  idPrefix: string;
}) {
  const set =
    (key: keyof MarginFields) => (value: string) =>
      onChange({ ...fields, [key]: value });

  const mismatch = marginsMismatch(fields);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name={`${idPrefix}-provider`}>
          <Label>Provider API (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.providerMargin}
            variant="secondary"
            onChange={(e) => set("providerMargin")(e.target.value)}
          />
        </TextField>
        <TextField name={`${idPrefix}-admin`}>
          <Label>Admin (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.adminMargin}
            variant="secondary"
            onChange={(e) => set("adminMargin")(e.target.value)}
          />
        </TextField>
        <TextField name={`${idPrefix}-distributor`}>
          <Label>Distributor (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.distributorMargin}
            variant="secondary"
            onChange={(e) => set("distributorMargin")(e.target.value)}
          />
        </TextField>
        <TextField name={`${idPrefix}-retailer`}>
          <Label>Retailer (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.retailerMargin}
            variant="secondary"
            onChange={(e) => set("retailerMargin")(e.target.value)}
          />
        </TextField>
      </div>
      {mismatch ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Margin mismatch</Alert.Title>
            <Alert.Description>
              Admin + distributor + retailer should equal the provider margin.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
}
