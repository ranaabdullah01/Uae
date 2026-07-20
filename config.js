// ================================================
// CONFIGURATION FILE - Edit all client values here
// ================================================

export const CONFIG = {
    // Agent Information
    agentName: "Ahmed Khan",
    agentTitle: "Luxury Real Estate Specialist",
    rernaBRN: "123456",
    experience: "12",
    bio: "With over 12 years of experience in Dubai's luxury real estate market, I help clients find their dream homes and make smart investments. Specializing in off-plan projects and Golden Visa properties. My commitment to excellence and deep market knowledge has helped hundreds of clients achieve their property goals.",
    languages: "English, Arabic, Urdu, Hindi",
    photo: "https://via.placeholder.com/400x400/0A1628/C9A84C?text=Agent",
    specialties: "Luxury Properties, Off-Plan Investments, Golden Visa, Property Valuation, Portfolio Management",

    // Agency Information
    agencyName: "AK Web Services",
    agencyLogo: "https://via.placeholder.com/40x40/C9A84C/FFFFFF?text=AK",
    address: "Dubai, UAE",
    rernaNumber: "123456",
    phone: "+971501234567",
    whatsapp: "+971501234567",
    email: "info@akwebservices.com",
    whatsappGreeting: "Hello! I'm interested in your real estate services.",

    // Social Links
    social: {
        facebook: "https://facebook.com/akwebservices",
        instagram: "https://instagram.com/akwebservices",
        linkedin: "https://linkedin.com/company/akwebservices",
        youtube: "https://youtube.com/akwebservices"
    },

    // Portal URLs
    propertyFinderURL: "https://propertyfinder.ae/agents/ak-web-services",
    bayutURL: "https://bayut.com/agents/ak-web-services",

    // Site Settings
    workerURL: "https://ranabullah01.ranabullah01.workers.dev",
    siteName: "AK Web Services - Luxury Real Estate Dubai",
    siteDescription: "Premium Dubai real estate services. Buy, rent, and invest in luxury properties with AK Web Services.",
    gaTrackingID: "UA-XXXXXXXXX-X",

    // Stats (update these as needed)
    stats: {
        yearsExperience: "12",
        propertiesSold: "850",
        happyClients: "1200"
    },

    // Testimonials
    testimonials: [
        {
            name: "Sarah Johnson",
            detail: "Property Investor, UK",
            quote: "Ahmed helped me find the perfect investment property in Dubai. His knowledge of off-plan projects and market trends is exceptional."
        },
        {
            name: "Michael Chen",
            detail: "Business Owner, Singapore",
            quote: "Professional, responsive, and truly understands luxury real estate. Made our property purchase seamless."
        },
        {
            name: "Emma Williams",
            detail: "Expat, Australia",
            quote: "From our first meeting to property handover, Ahmed provided outstanding service. Highly recommend for anyone buying in Dubai."
        },
        {
            name: "David Rodriguez",
            detail: "Golden Visa Applicant, Spain",
            quote: "Ahmed guided us through the entire Golden Visa process. His expertise made a complex process simple."
        }
    ],

    // Recent Sales
    recentSales: [
        {
            title: "Luxury Penthouse",
            community: "Downtown Dubai",
            price: "AED 12,500,000"
        },
        {
            title: "Beachfront Villa",
            community: "Palm Jumeirah",
            price: "AED 25,000,000"
        },
        {
            title: "Sky View Apartment",
            community: "Dubai Marina",
            price: "AED 3,800,000"
        }
    ],

    // DLD Rental Index Data (example values)
    rentalIndex: [
        { community: "Downtown Dubai", oneBR: "AED 95,000", twoBR: "AED 145,000" },
        { community: "Dubai Marina", oneBR: "AED 85,000", twoBR: "AED 130,000" },
        { community: "Palm Jumeirah", oneBR: "AED 120,000", twoBR: "AED 180,000" },
        { community: "Emirates Hills", oneBR: "AED 150,000", twoBR: "AED 250,000" },
        { community: "Jumeirah Village Circle", oneBR: "AED 55,000", twoBR: "AED 80,000" },
        { community: "Dubai Hills Estate", oneBR: "AED 75,000", twoBR: "AED 120,000" }
    ]
};

// Export individual values for easier imports
export const {
    agentName,
    agentTitle,
    rernaBRN,
    experience,
    bio,
    languages,
    photo,
    specialties,
    agencyName,
    agencyLogo,
    address,
    rernaNumber,
    phone,
    whatsapp,
    email,
    whatsappGreeting,
    social,
    propertyFinderURL,
    bayutURL,
    workerURL,
    siteName,
    siteDescription,
    gaTrackingID,
    stats,
    testimonials,
    recentSales,
    rentalIndex
} = CONFIG;

// Default export for convenient importing
export default CONFIG;
