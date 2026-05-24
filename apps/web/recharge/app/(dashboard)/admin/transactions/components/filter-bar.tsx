"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FilterX } from "lucide-react";

export function FilterBar({
    initialStatus,
    initialOperator,
    initialSearch,
    initialDateFrom,
    initialDateTo
}: {
    initialStatus: string,
    initialOperator: string,
    initialSearch: string,
    initialDateFrom: string,
    initialDateTo: string
}) {
    const router = useRouter();
    
    // Controlled inputs to prevent spamming the routing framework constantly.
    // We only trigger URL updates when they specifically hit "Apply" or change a dropdown explicitly.
    const [status, setStatus] = useState(initialStatus);
    const [operator, setOperator] = useState(initialOperator);
    const [search, setSearch] = useState(initialSearch);
    const [dateFrom, setDateFrom] = useState(initialDateFrom);
    const [dateTo, setDateTo] = useState(initialDateTo);

    const applyFilters = (overrides?: { status?: string; operator?: string }) => {
        const params = new URLSearchParams();
        
        const applyStatus = overrides?.status ?? status;
        const applyOperator = overrides?.operator ?? operator;

        if (applyStatus !== "ALL") params.set("status", applyStatus);
        if (applyOperator !== "ALL") params.set("operator", applyOperator);
        if (search.trim()) params.set("search", search.trim());
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        router.push(`/admin/transactions?${params.toString()}`);
    };

    const clearFilters = () => {
        setStatus("ALL");
        setOperator("ALL");
        setSearch("");
        setDateFrom("");
        setDateTo("");
        router.push(`/admin/transactions`);
    };

    return (
        <div className="flex flex-col gap-4 p-4 border border-border rounded-md bg-card shadow-sm">
            <div className="flex flex-col md:flex-row flex-wrap gap-3">
                <div className="flex items-center relative flex-1 min-w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search phones, identities, or ref ID..." 
                        className="pl-8 bg-background h-10 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    />
                </div>

                <div className="w-full md:w-auto min-w-[160px]">
                    <Select value={status} onValueChange={(val) => { setStatus(val); applyFilters({ status: val }); }}>
                        <SelectTrigger className="bg-background h-10">
                            <SelectValue placeholder="Network Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Outcomes</SelectItem>
                            <SelectItem value="SUCCESS">Success Only</SelectItem>
                            <SelectItem value="PENDING">Pending (Hanging)</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                            <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-auto min-w-[160px]">
                    <Select value={operator} onValueChange={(val) => { setOperator(val); applyFilters({ operator: val }); }}>
                        <SelectTrigger className="bg-background h-10">
                            <SelectValue placeholder="Carrier Identity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Carriers</SelectItem>
                            <SelectItem value="JIO">Jio</SelectItem>
                            <SelectItem value="AIRTEL">Airtel</SelectItem>
                            <SelectItem value="VI">Vodafone Idea</SelectItem>
                            <SelectItem value="BSNL">BSNL</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button onClick={() => applyFilters()} className="flex-1 md:w-32 h-10" variant="secondary">
                        Search Log
                    </Button>
                    <Button onClick={clearFilters} variant="outline" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground" title="Clear all configurations">
                        <FilterX className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground font-medium w-auto sm:w-24 shrink-0">Date Range:</span>
                <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="text-muted-foreground">to</span>
                 <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button variant="ghost" size="sm" onClick={() => applyFilters()} className="text-muted-foreground h-8">
                  Apply Date Range
                </Button>
            </div>
        </div>
    );
}
