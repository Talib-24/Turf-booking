import React, { useState } from 'react';
import { SportType, Turf } from '../types';
import { formatINR } from '../lib/constants';
import { MapPin, Star, Sparkles, Trophy, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

interface TurfExplorerProps {
  turfs: Turf[];
  onSelectTurf: (turfId: string) => void;
  onOpenConcurrencyLab: () => void;
}

export const TurfExplorer: React.FC<TurfExplorerProps> = ({
  turfs,
  onSelectTurf,
  onOpenConcurrencyLab,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(200000); // 2,000 in paise

  const filteredTurfs = turfs.filter((t) => {
    if (selectedSport !== 'all' && t.sport !== selectedSport) return false;
    if (selectedCity !== 'all' && t.city !== selectedCity) return false;
    if (t.pricePerHourPaise > maxPrice) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchAddress = t.address.toLowerCase().includes(q);
      const matchSurface = t.surface.toLowerCase().includes(q);
      if (!matchName && !matchAddress && !matchSurface) return false;
    }
    return true;
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 p-8 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-xs font-semibold tracking-wide uppercase text-emerald-400">
            <span>Engineering-Grade Venue Engine</span>
            <span aria-hidden="true">·</span>
            <span>Zero Double-Booking Guarantee</span>
            <span aria-hidden="true">·</span>
            <span>10-Min Hold Expiry</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
            Instant Turf Reservations with Zero Concurrency Conflicts
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Book professional football, cricket, badminton, and tennis grounds. Powered by PostgreSQL range exclusion constraints and Razorpay automated reconciliation.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onSelectTurf(turfs[0]?.id || '')}
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Explore Available Slots</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenConcurrencyLab}
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <span>Test 50-Request Concurrency</span>
            </button>
          </div>
        </div>

        {/* Feature proof strip */}
        <div className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-400">
          <div>
            <div className="font-bold text-slate-200 text-sm">Postgres 16 GiST</div>
            <div>Exclusion range constraint</div>
          </div>
          <div>
            <div className="font-bold text-slate-200 text-sm">10-Min Live Hold</div>
            <div>Background sweeper + cleanup</div>
          </div>
          <div>
            <div className="font-bold text-slate-200 text-sm">Idempotent Webhook</div>
            <div>Razorpay HMAC verification</div>
          </div>
          <div>
            <div className="font-bold text-slate-200 text-sm">Automated Refunds</div>
            <div>Policy-based & late pay protection</div>
          </div>
        </div>
      </section>

      {/* Filter and Discovery Bar */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Available Sports Venues</h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Showing {filteredTurfs.length} of {turfs.length} verified arenas
            </div>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venue name, location, surface..."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
          {/* Sports Filter Tabs (Functional segmented buttons) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Sports' },
              { id: 'football', label: 'Football' },
              { id: 'cricket', label: 'Cricket' },
              { id: 'badminton', label: 'Badminton' },
              { id: 'tennis', label: 'Tennis' },
            ].map((sport) => (
              <button
                key={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedSport === sport.id
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            {/* City Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            {/* Price Max slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Max:</span>
              <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                {formatINR(maxPrice)}/hr
              </span>
              <input
                type="range"
                min={80000}
                max={200000}
                step={10000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-20 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Turf Grid List */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTurfs.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
            <p className="font-medium text-slate-300">No arenas found matching your current filter criteria.</p>
            <button
              onClick={() => {
                setSelectedSport('all');
                setSelectedCity('all');
                setMaxPrice(200000);
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTurfs.map((turf) => (
            <div
              key={turf.id}
              className="group flex flex-col justify-between rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
            >
              {/* Turf Image */}
              <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden">
                <img
                  src={turf.image}
                  alt={turf.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-medium bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-700/80 text-emerald-300 uppercase tracking-wider font-mono">
                  {turf.sport}
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-xs bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-700/80 text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-mono tabular-nums font-semibold">{turf.rating}</span>
                  <span className="text-slate-400">({turf.reviewCount})</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1 text-slate-300 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{turf.address}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{turf.name}</h3>

                  {/* Surface description */}
                  <p className="mt-1 text-xs text-slate-400 line-clamp-1">{turf.surface}</p>

                  {/* Unboxed metadata with typographic separators */}
                  <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-slate-400">
                    <span>{turf.dimensions}</span>
                    <span aria-hidden="true">·</span>
                    <span>{turf.lighting}</span>
                    <span aria-hidden="true">·</span>
                    <span>{turf.city}</span>
                  </div>

                  {/* Amenities */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                    {turf.amenities.slice(0, 3).map((amenity, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{amenity}</span>
                      </span>
                    ))}
                    {turf.amenities.length > 3 && (
                      <span className="inline-flex items-center bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">
                        +{turf.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Price & Slot CTA */}
                <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">Rate per slot</div>
                    <div className="text-xl font-mono tabular-nums font-bold text-emerald-400">
                      {formatINR(turf.pricePerHourPaise)}
                      <span className="text-xs text-slate-400 font-sans font-normal"> / hour</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectTurf(turf.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>View Slots</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
