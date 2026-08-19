export type City = {
  slug: string;
  name: string;
  state: string;
  localPhrase: string;
  businessTypes: string;
  metaTitle: string;
  metaDescription: string;
};

export const CITIES: City[] = [
  {
    slug: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    localPhrase: "From Bandra salons to Andheri clinics",
    businessTypes: "salons, clinics, restaurants, real estate agents, coaching centres",
    metaTitle: "AI Receptionist in Mumbai — 24/7 Hindi + English Call Answering | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Mumbai businesses. Answers calls 24/7 in Hindi, Marathi & English — books appointments, handles enquiries, and follows up on WhatsApp.",
  },
  {
    slug: "delhi",
    name: "Delhi NCR",
    state: "Delhi",
    localPhrase: "From Connaught Place clinics to Gurgaon gyms",
    businessTypes: "clinics, gyms, real estate, salons, restaurants",
    metaTitle: "AI Receptionist in Delhi NCR — 24/7 Hindi + English Call Answering | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Delhi NCR businesses. Answers 24/7 in Hindi & English, books appointments, follows up on WhatsApp. Free trial available.",
  },
  {
    slug: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    localPhrase: "From Koramangala salons to Whitefield coaching centres",
    businessTypes: "coaching centres, salons, clinics, gyms, restaurants",
    metaTitle: "AI Receptionist in Bengaluru — 24/7 Kannada, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Bengaluru businesses. Answers 24/7 in Kannada, Hindi & English — bookings, CRM, and WhatsApp follow-ups on autopilot.",
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    localPhrase: "From Banjara Hills clinics to Gachibowli coaching centres",
    businessTypes: "clinics, coaching, restaurants, gyms, real estate",
    metaTitle: "AI Receptionist in Hyderabad — 24/7 Telugu, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Hyderabad businesses. Answers 24/7 in Telugu, Hindi & English — books appointments, follows up on WhatsApp.",
  },
  {
    slug: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    localPhrase: "From T Nagar salons to Adyar clinics",
    businessTypes: "clinics, salons, gyms, coaching centres, restaurants",
    metaTitle: "AI Receptionist in Chennai — 24/7 Tamil, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Chennai businesses. Answers 24/7 in Tamil, Hindi & English — books appointments, syncs CRM, follows up on WhatsApp.",
  },
  {
    slug: "pune",
    name: "Pune",
    state: "Maharashtra",
    localPhrase: "From Kothrud clinics to Hinjewadi gyms",
    businessTypes: "clinics, gyms, coaching, salons, restaurants",
    metaTitle: "AI Receptionist in Pune — 24/7 Marathi, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Pune businesses. Answers 24/7 in Marathi, Hindi & English — bookings, CRM, WhatsApp follow-ups.",
  },
  {
    slug: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    localPhrase: "From Satellite salons to CG Road clinics",
    businessTypes: "clinics, salons, restaurants, real estate, coaching",
    metaTitle: "AI Receptionist in Ahmedabad — 24/7 Gujarati, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Ahmedabad businesses. Answers 24/7 in Gujarati, Hindi & English — books appointments, handles enquiries.",
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    localPhrase: "From MI Road salons to Malviya Nagar coaching centres",
    businessTypes: "coaching centres, salons, restaurants, clinics, tent houses",
    metaTitle: "AI Receptionist in Jaipur — 24/7 Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Jaipur businesses. Answers 24/7 in Hindi & English — books appointments, handles enquiries, follows up on WhatsApp.",
  },
  {
    slug: "kolkata",
    name: "Kolkata",
    state: "West Bengal",
    localPhrase: "From Park Street restaurants to Salt Lake coaching centres",
    businessTypes: "coaching, restaurants, clinics, salons, gyms",
    metaTitle: "AI Receptionist in Kolkata — 24/7 Bengali, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Kolkata businesses. Answers 24/7 in Bengali, Hindi & English — bookings, CRM, WhatsApp follow-ups.",
  },
  {
    slug: "lucknow",
    name: "Lucknow",
    state: "Uttar Pradesh",
    localPhrase: "From Hazratganj clinics to Gomti Nagar coaching centres",
    businessTypes: "clinics, coaching, salons, restaurants, tent houses",
    metaTitle: "AI Receptionist in Lucknow — 24/7 Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Lucknow businesses. Answers 24/7 in Hindi & English — books appointments, handles enquiries.",
  },
  {
    slug: "chandigarh",
    name: "Chandigarh",
    state: "Punjab & Haryana",
    localPhrase: "From Sector 17 salons to Sector 8 clinics",
    businessTypes: "clinics, salons, gyms, restaurants, coaching",
    metaTitle: "AI Receptionist in Chandigarh — 24/7 Punjabi, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Chandigarh businesses. Answers 24/7 in Punjabi, Hindi & English — bookings, CRM, WhatsApp follow-ups.",
  },
  {
    slug: "kochi",
    name: "Kochi",
    state: "Kerala",
    localPhrase: "From MG Road clinics to Kakkanad tech offices",
    businessTypes: "clinics, salons, restaurants, coaching, real estate",
    metaTitle: "AI Receptionist in Kochi — 24/7 Malayalam, Hindi & English | DeskBuddy",
    metaDescription:
      "AI phone receptionist for Kochi businesses. Answers 24/7 in Malayalam, Hindi & English — books appointments, handles enquiries.",
  },
];

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}
