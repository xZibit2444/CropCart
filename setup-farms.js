// Setup script to create farms table and seed sample data in Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Read from .env.local or use hardcoded values
const SUPABASE_URL = 'https://djuvkrjotiowrngcjqrm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IAdc3pEESugbCt_sKAE5nQ_9zLG03Kg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sample farms data
const sampleFarms = [
  {
    name: "Green Valley Organic Farm",
    location: "Accra",
    specialties: ["Tomatoes", "Lettuce", "Carrots"],
    certifications: ["Organic", "Fair Trade"],
    features: ["Drip Irrigation", "Greenhouse"],
    capacity: "5000 kg/month",
    established: 2018,
    contact: "contact@greenvalley.com"
  },
  {
    name: "Kumasi Cooperative",
    location: "Kumasi",
    specialties: ["Cocoa", "Plantains", "Cassava"],
    certifications: ["Fair Trade"],
    features: ["Sustainable Practices"],
    capacity: "8000 kg/month",
    established: 2015,
    contact: "info@kumasifarming.com"
  },
  {
    name: "Coastal Produce Farm",
    location: "Tema",
    specialties: ["Peppers", "Onions", "Cucumber"],
    certifications: ["Organic"],
    features: ["Drip Irrigation"],
    capacity: "4500 kg/month",
    established: 2019,
    contact: "coastal@producefarm.com"
  },
  {
    name: "Cape Coast Vegetables",
    location: "Cape Coast",
    specialties: ["Cabbage", "Spinach", "Kale"],
    certifications: ["Certified Organic", "Fair Trade"],
    features: ["Greenhouse", "Composting"],
    capacity: "3000 kg/month",
    established: 2017,
    contact: "info@capecoastveg.com"
  },
  {
    name: "Takoradi Mixed Farm",
    location: "Takoradi",
    specialties: ["Maize", "Beans", "Soy"],
    certifications: ["Fair Trade"],
    features: ["Crop Rotation", "Water Harvesting"],
    capacity: "7000 kg/month",
    established: 2014,
    contact: "contact@takofarm.com"
  },
  {
    name: "Greater Accra Citrus",
    location: "Greater Accra Region",
    specialties: ["Oranges", "Lemons", "Limes"],
    certifications: ["Organic"],
    features: ["Drip Irrigation"],
    capacity: "6000 kg/month",
    established: 2016,
    contact: "citrus@graccra.com"
  },
  {
    name: "Ashanti Grains Farm",
    location: "Kumasi",
    specialties: ["Rice", "Millet", "Sorghum"],
    certifications: ["Fair Trade"],
    features: ["Water Harvesting"],
    capacity: "9000 kg/month",
    established: 2013,
    contact: "grains@ashanti.com"
  },
  {
    name: "Northern Region Vegetables",
    location: "Accra",
    specialties: ["Eggplant", "Okra", "Green Beans"],
    certifications: ["Certified Organic"],
    features: ["Greenhouse", "Drip Irrigation"],
    capacity: "5500 kg/month",
    established: 2020,
    contact: "northveg@cropcart.com"
  },
  {
    name: "Central Farm Cooperative",
    location: "Cape Coast",
    specialties: ["Pumpkin", "Watermelon", "Cantaloupe"],
    certifications: ["Fair Trade", "Organic"],
    features: ["Sustainable Practices"],
    capacity: "4000 kg/month",
    established: 2018,
    contact: "central@farmcoop.com"
  },
  {
    name: "Tema Aqua-Farm",
    location: "Tema",
    specialties: ["Aquaponics", "Leafy Greens", "Herbs"],
    certifications: ["Certified Organic"],
    features: ["Modern Technology"],
    capacity: "2500 kg/month",
    established: 2021,
    contact: "aqua@temafarm.com"
  },
  {
    name: "Takoradi Spice Farm",
    location: "Takoradi",
    specialties: ["Ginger", "Garlic", "Turmeric"],
    certifications: ["Organic"],
    features: ["Traditional Methods"],
    capacity: "3500 kg/month",
    established: 2015,
    contact: "spice@takofarming.com"
  },
  {
    name: "Accra Urban Farm",
    location: "Accra",
    specialties: ["Herbs", "Microgreens", "Sprouts"],
    certifications: ["Certified Organic", "Fair Trade"],
    features: ["Vertical Farming", "Greenhouse"],
    capacity: "1500 kg/month",
    established: 2022,
    contact: "urban@accrafarm.com"
  }
];

async function setupFarms() {
  console.log('Starting farms table setup...');

  // First check if table exists by trying to select
  const { data: checkData, error: checkError } = await supabase
    .from('farms')
    .select('*')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.log('Farms table does not exist. You need to create it in Supabase SQL Editor.');
    console.log('Copy and paste this SQL in your Supabase SQL Editor:');
    console.log(`
CREATE TABLE farms (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  specialties TEXT[] NOT NULL,
  certifications TEXT[] NOT NULL,
  features TEXT[] NOT NULL,
  capacity TEXT NOT NULL,
  established INTEGER NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON farms
  FOR SELECT USING (true);
    `);
    return;
  }

  // Check if there's already data
  const { data: existingData } = await supabase.from('farms').select('*');
  
  if (existingData && existingData.length > 0) {
    console.log(`Farms table already has ${existingData.length} records. Skipping seed.`);
    return;
  }

  // Insert sample data
  const { data, error } = await supabase
    .from('farms')
    .insert(sampleFarms)
    .select();

  if (error) {
    console.error('Error inserting farms:', error);
    return;
  }

  console.log(`Successfully inserted ${data.length} farms!`);
  console.log('Farms table is ready to use.');
}

setupFarms().catch(console.error);
