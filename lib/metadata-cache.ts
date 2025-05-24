// This is a utility to cache metadata to avoid repeated API calls
// Simple in-memory cache that persists during a session

interface Metadata {
    title?: string | null;
    siteName?: string | null;
    description?: string | null;
    favicon?: string | null;
    image?: string | null;
    author?: string | null;
    publishedDate?: string | null;
    error?: string | null;
}

type MetadataCache = {
    [url: string]: {
        data: Metadata;
        timestamp: number;
    };
};

// Cache that persists as long as the page is not refreshed
const inMemoryCache: MetadataCache = {};

// Track ongoing fetch requests to prevent duplicate requests
const pendingRequests: Map<string, Promise<Metadata>> = new Map();

// Cache expiration time - 1 hour in milliseconds
const CACHE_EXPIRATION = 60 * 60 * 1000;

export const metadataCache = {
    // Get metadata from cache or fetch it
    async get(url: string): Promise<Metadata> {
        // Check if a request for this URL is already in progress
        const pendingRequest = pendingRequests.get(url);
        if (pendingRequest) {
            console.debug(`Using pending request for ${url}`);
            return pendingRequest;
        }

        // Check memory cache first
        const cachedData = this.getFromMemory(url);
        if (cachedData) {
            console.debug(`Using memory cache for ${url}`);
            return cachedData;
        }

        // Check session storage
        const sessionData = this.getFromSession(url);
        if (sessionData) {
            console.debug(`Using session storage cache for ${url}`);
            // Store in memory for faster access next time
            this.setInMemory(url, sessionData);
            return sessionData;
        }

        // If not in any cache, fetch it
        console.debug(`Fetching fresh data for ${url}`);
        return this.fetchAndCache(url);
    },

    // Get from in-memory cache if it exists and hasn't expired
    getFromMemory(url: string): Metadata | null {
        const cached = inMemoryCache[url];
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION) {
            return cached.data;
        }
        return null;
    },

    // Get from sessionStorage if it exists
    getFromSession(url: string): Metadata | null {
        try {
            const cachedData = sessionStorage.getItem(`metadata-${url}`);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (e) {
            console.warn("Error accessing sessionStorage:", e);
        }
        return null;
    },

    // Store in both memory and session storage
    setInMemory(url: string, data: Metadata): void {
        inMemoryCache[url] = {
            data,
            timestamp: Date.now()
        };

        try {
            sessionStorage.setItem(`metadata-${url}`, JSON.stringify(data));
        } catch (e) {
            console.warn("Error caching metadata in sessionStorage:", e);
        }
    },    // Fetch metadata from API and cache it
    async fetchAndCache(url: string): Promise<Metadata> {
        // Check if a request for this URL is already in progress
        const pendingRequest = pendingRequests.get(url);
        if (pendingRequest) {
            return pendingRequest;
        }

        // Create a new request promise
        const fetchPromise = (async () => {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, {
                    signal: controller.signal
                });

                const data: Metadata = await response.json();

                // Always cache the response, even if it's not OK (e.g., 403 errors)
                // This prevents repeated requests to URLs that always fail
                this.setInMemory(url, data);

                // If the response had an error status but no error field, add it
                if (!response.ok && !data.error) {
                    data.error = `Failed with status: ${response.status}`;
                }

                return data;
            } catch (error) {
                console.error("Error fetching citation metadata:", error);
                const errorData = { error: 'Error fetching metadata' };
                this.setInMemory(url, errorData);
                return errorData;
            } finally {
                clearTimeout(timeoutId);
                // Remove from pending requests map once completed
                pendingRequests.delete(url);
                console.debug(`Metadata fetch for ${url} completed and removed from pending requests`);
            }
        })();

        // Add the promise to the pending requests map
        pendingRequests.set(url, fetchPromise);

        return fetchPromise;
    }
};
