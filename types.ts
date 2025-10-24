// Fix: Create types.ts to define the data structures for the application.
export interface Activity {
    time: string;
    description: string;
    icon: string;
    latitude?: number;
    longitude?: number;
    transportFromPrevious?: {
        method: string;
        duration: string;
        cost?: string;
        route?: string;
    };
    klookUrl?: string;
    bookingUrl?: string;
    tripAdvisorUrl?: string;
}

export interface DailyPlan {
    day: number;
    title: string;
    activities: Activity[];
}

export interface TransportationInfo {
    description: string;
    options: string[];
}

export interface PriceInfo {
    level: string;
    description: string;
    examples: string[];
}

export interface TravelPlan {
    city: string;
    country: string;
    startDate: string;
    endDate: string;
    constraints?: {
        arrivalFlight?: {
            airport: string;
            arrivalTime: string;
            flightNumber?: string;
        };
        departureFlight?: {
            airport: string;
            departureTime: string;
            flightNumber?: string;
        };
        accommodation?: {
            name: string;
            address: string;
            latitude: number;
            longitude: number;
            checkInDate?: string;
            checkOutDate?: string;
        };
    };
    weather: {
        averageTemp: string;
        description: string;
    };
    exchangeRate: {
        from: string;
        to: string;
        rate: string;
    };
    culturalTips: string[];
    itinerary: DailyPlan[];
    cityLatitude: number;
    cityLongitude: number;
    transportationInfo: TransportationInfo;
    priceInfo: PriceInfo;
    confirmationMessage?: string;
}

export interface PackingItem {
    item: string;
    note?: string;
}

export interface PackingCategory {
    category: string;
    items: PackingItem[];
}

export interface PackingList {
    packing_list: PackingCategory[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}