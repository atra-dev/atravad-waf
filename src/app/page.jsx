import { connection } from "next/server";
import HomePageClient from "./home-page-client";
import { adminDb } from '@/lib/firebase-admin';

async function getHomePageThreatMapData() {
  if (!adminDb) {
    return {
      attackPoints: [],
      countries: [],
      protectedCountries: [],
    };
  }

  try {
    const [logsSnapshot, appsSnapshot] = await Promise.all([
      adminDb.collection('logs').orderBy('timestamp', 'desc').limit(240).get(),
      adminDb.collection('applications').limit(80).get(),
    ]);

    const attackPointMap = new Map();
    const countryMap = new Map();

    for (const doc of logsSnapshot.docs) {
      const data = doc.data();
      const decision = String(data?.decision || '').trim().toLowerCase();
      if (decision !== 'waf_blocked' && decision !== 'origin_denied') continue;

      const countryCode = String(data?.geoCountryCode || '').trim().toUpperCase();
      const countryName = String(data?.geoCountry || '').trim() || countryCode || 'Unknown';
      if (countryCode) {
        const existingCountry = countryMap.get(countryCode) || {
          code: countryCode,
          name: countryName,
          count: 0,
          blocked: 0,
          wafBlocked: 0,
          originDenied: 0,
          allowed: 0,
        };
        existingCountry.count += 1;
        existingCountry.blocked += 1;
        if (decision === 'waf_blocked') existingCountry.wafBlocked += 1;
        if (decision === 'origin_denied') existingCountry.originDenied += 1;
        countryMap.set(countryCode, existingCountry);
      }

      const latitude = Number(data?.geoLatitude);
      const longitude = Number(data?.geoLongitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const pointKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      const existing = attackPointMap.get(pointKey) || {
        id: pointKey,
        latitude,
        longitude,
        country: data?.geoCountry || '',
        countryCode: data?.geoCountryCode || '',
        blocked: 0,
      };

      existing.blocked += 1;
      attackPointMap.set(pointKey, existing);
    }

    const attackPoints = Array.from(attackPointMap.values())
      .sort((a, b) => b.blocked - a.blocked)
      .slice(0, 36);
    const countries = Array.from(countryMap.values())
      .sort((a, b) => b.blocked - a.blocked)
      .slice(0, 12);

    const protectedCountries = Array.from(
      new Set(
        appsSnapshot.docs
          .map((doc) => String(doc.data()?.originCountry || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 4);

    return {
      attackPoints,
      countries,
      protectedCountries,
    };
  } catch (error) {
    console.error('Error loading homepage threat map data:', error);
    return {
      attackPoints: [],
      countries: [],
      protectedCountries: [],
    };
  }
}

export default async function HomePage() {
  await connection();
  const threatMapData = await getHomePageThreatMapData();
  return <HomePageClient threatMapData={threatMapData} />;
}
