import { useI18n } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import type { QuestionChoice } from "@/lib/mock-data";

interface RowDef {
  id: string;
  textEn: string;
  textTh: string;
}

interface Props {
  rows: RowDef[];
  columns: QuestionChoice[];
  values: Record<string, string>;
  onChange: (rowId: string, colValue: string) => void;
}

export function MatrixTable({ rows, columns, values, onChange }: Props) {
  const { lang } = useI18n();

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm border-collapse min-w-[400px]">
        <thead>
          <tr>
            <th className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wider p-2 w-1/3" />
            {columns.map((col) => (
              <th key={col.value} className="text-center font-medium text-muted-foreground text-xs uppercase tracking-wider p-2">
                {lang === "th" ? col.labelTh : col.labelEn}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="p-2 text-sm">{lang === "th" ? row.textTh : row.textEn}</td>
              {columns.map((col) => {
                const selected = values[row.id] === col.value;
                return (
                  <td key={col.value} className="p-1 text-center">
                    <Label
                      onClick={() => onChange(row.id, col.value)}
                      className={`flex items-center justify-center w-9 h-9 rounded-full mx-auto cursor-pointer transition-all duration-200 ${
                        selected
                          ? "bg-primary text-primary-foreground shadow-sm scale-110"
                          : "hover:bg-muted/60 border border-transparent hover:border-border"
                      }`}
                    >
                      <input type="radio" name={`matrix-${row.id}`} value={col.value} checked={selected} onChange={() => {}} className="sr-only" />
                      <span className="text-xs font-semibold">{lang === "th" ? col.labelTh : col.labelEn}</span>
                    </Label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
