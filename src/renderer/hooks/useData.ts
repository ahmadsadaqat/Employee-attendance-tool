import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FrappeApp } from 'frappe-js-sdk';

// Helper to get the current Frappe client or constructed URL
const getBaseUrl = () => {
    return (window as any).frappeBaseUrl || '/frappe'; // Fallback
};

// Generic Frappe DocList fetcher
const fetchDocList = async (doctype: string, filters?: any, fields?: string[], orderBy?: { field: string, order: 'desc' | 'asc' }, limit_start?: number, limit?: number) => {
    const baseUrl = getBaseUrl();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Inject proxy header if needed (for browser dev) - REMOVED: Main Process handles auth injection now
    // if ((window as any).frappeRealUrl) {
    //     headers['X-Proxy-Target'] = (window as any).frappeRealUrl;
    // }

    const params = new URLSearchParams({
        // doctype is already in the URL path, do not add it here as it causes "multiple values" error
        fields: JSON.stringify(fields || ["*"]),
        filters: JSON.stringify(filters || []),
        limit_start: timestamp(limit_start || 0),
        limit_page_length: timestamp(limit || 20),
        order_by: orderBy ? `${orderBy.field} ${orderBy.order}` : 'modified desc'
    });

    // We use the patched fetch which handles credentials and proxy headers
    const response = await fetch(`${baseUrl}/api/resource/${doctype}?${params.toString()}`, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        throw new Error(`Frappe fetch error: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
};

// Helper for params
function timestamp(n: number) { return n.toString() }


// Hook for fetching logs from ZKTeco devices via IPC
export const useFrappeDocList = (doctype: string, options?: {
    filters?: any,
    fields?: string[],
    orderBy?: { field: string, order: 'desc' | 'asc' },
    limit?: number,
    enabled?: boolean,
    refetchInterval?: number
}) => {
    // Include URL in key to force refetch on switch
    const currentUrl = (window as any).frappeBaseUrl || '';

    return useQuery({
        queryKey: ['frappe', currentUrl, doctype, options?.filters, options?.limit],
        queryFn: () => fetchDocList(doctype, options?.filters, options?.fields, options?.orderBy, 0, options?.limit),
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval
    });
};

// Hook for fetching logs from ZKTeco devices via IPC
export const useDeviceLogs = (enabled: boolean = false) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            // Logic to fetch from ALL devices would go here,
            // but usually this is a pervasive action.
            // For now, let's assume we invoke the main process function 'device:fetchLogs' for known devices.
            // But realistically, the Dashboard calls `mutateLogs` which refetches from Frappe.
            // The user asked to fetch access logs FROM ZKTeco devices.
            // That implies triggering the sync.

            // We'll mimic the existing "Sync Devices" logic:
            // 1. Get list of devices (could be another query)
            const devices = await (window as any).api.listDevices();
            let totalImported = 0;

            for (const device of devices) {
                const result = await (window as any).api.fetchLogs(device.ip, device.port);
                if (result.imported) totalImported += result.imported;
            }
            return totalImported;
        },
        onSuccess: () => {
             // Broadly invalidate frappe queries to pick up new data regardless of URL
             queryClient.invalidateQueries({ queryKey: ['frappe'] });
        }
    });

    return mutation;
};
