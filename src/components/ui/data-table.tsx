import { useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ColumnConfig<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  search?: boolean | { placeholder?: string; keys: string[] };
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
}

function sortByKey<T>(data: T[], key: string, dir: "asc" | "desc"): T[] {
  return [...data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") return dir === "asc" ? aVal - bVal : bVal - aVal;
    return dir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });
}

export function DataTable<T>({
  data, columns, search, pageSize = 10, loading, emptyMessage, keyExtractor,
}: DataTableProps<T>) {
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const searchOpts = typeof search === "object" ? search : null;
  const searchKeys = searchOpts?.keys ?? [];

  const filtered = useMemo(() => {
    if (!searchText || searchKeys.length === 0) return data;
    const q = searchText.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = (item as Record<string, unknown>)[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchText, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return sortByKey(filtered, sortKey, sortDir);
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (key: string) => {
    setPage(0);
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleSearch = useCallback((val: string) => {
    setSearchText(val);
    setPage(0);
  }, []);

  return (
    <div className="space-y-3">
      {search && (
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder={searchOpts?.placeholder ?? "Search..."} value={searchText} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.className, col.sortable && "cursor-pointer select-none")}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                  {emptyMessage ?? "No data"}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={keyExtractor(item)} className="group">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[4rem] text-center">{safePage + 1} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
