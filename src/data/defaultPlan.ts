import type { AirQualityPlanResponse, HouseholdProfileInput } from '../types/air';

export const DEFAULT_PROFILE: HouseholdProfileInput = {
  city: 'Salt Lake City, UT',
  neighborhoodType: 'valley_basin',
  householdSize: 4,
  hasChildrenOrSeniors: true,
  commuteMode: 'car_solo',
  heatingSource: 'gas_furnace',
  aqiLevel: 168,
  notes: 'Two school-age kids; afternoon walks around 4 PM; bedroom windows face an arterial road.',
};

export const STARTER_PLAN: AirQualityPlanResponse = {
  city: 'Salt Lake City, UT',
  aqiLevel: 168,
  commuteMode: 'car_solo',
  heatingSource: 'gas_furnace',
  peakSmogWindow: '06:30-09:30 & 17:00-21:30',
  summary:
    'Cold valley inversions trap tailpipe nitrogen oxides and fine particulate matter (PM2.5) close to street level during morning and evening rush hours. Shifting errands to mid-afternoon thermal mixing windows and sealing indoor infiltration cuts household particulate exposure significantly.',
  dailyRoutines: [
    {
      id: 'routine-1',
      timeWindow: 'morning',
      clockRange: '06:45-08:30',
      title: 'Hold Bedroom Windows Sealed During Morning Inversion',
      action:
        'Keep street-facing windows latched through 10:30 AM and run bedroom HEPA or DIY box filtration on medium speed before school wake-up.',
      co2SavedGrams: 180,
      pm25ExposureAvoidedPct: 34,
      whyItMatters:
        'Morning inversion traps cold exhaust near ground level; sealing infiltration prevents outdoor PM2.5 from equilibrating indoors while avoiding extra furnace cycling.',
    },
    {
      id: 'routine-2',
      timeWindow: 'commute',
      clockRange: '07:45-08:30',
      title: 'Combine School Drop-Off with Transit Park-and-Ride or Carpool',
      action:
        'Replace solo cold-start highway driving with a 2-family neighborhood carpool or light-rail feeder trip twice a week.',
      co2SavedGrams: 2450,
      pm25ExposureAvoidedPct: 26,
      whyItMatters:
        'Cold catalytic converters emit up to 4x higher particulate and NOx emissions in the first 3 km; eliminating cold-start trips directly lowers street-level smog.',
    },
    {
      id: 'routine-3',
      timeWindow: 'midday',
      clockRange: '13:30-15:00',
      title: '10-Minute Cross-Ventilation Purge & Outdoor Play Window',
      action:
        'Check local AQI; if afternoon mixing lowers PM2.5, open opposite windows for 10 minutes to flush indoor CO2 and schedule kids outdoor play before 4:00 PM.',
      co2SavedGrams: 120,
      pm25ExposureAvoidedPct: 22,
      whyItMatters:
        'Afternoon solar warming lifts the inversion layer temporarily, letting you refresh stale indoor air without drawing peak evening woodsmoke and traffic haze inside.',
    },
    {
      id: 'routine-4',
      timeWindow: 'evening',
      clockRange: '18:00-21:00',
      title: 'Zero-Combustion Dinner Prep & 19°C Setback Night Heating',
      action:
        'Use induction kettle, slow cooker, or lidded pans with range hood exhausted outdoors; lower night thermostat by 1.5°C and wear wool layers.',
      co2SavedGrams: 980,
      pm25ExposureAvoidedPct: 41,
      whyItMatters:
        'Unvented gas cooking spikes indoor NO2 and ultrafine particles above outdoor smog levels, while modest heating setbacks trim winter NOx emissions.',
    },
  ],
  indoorHacks: [
    {
      id: 'hack-1',
      costTier: 'Low-Cost',
      title: '4-Filter MERV-13 Corsi-Rosenthal Box Purifier',
      setupSteps: [
        'Tape four 20x20 MERV-13 pleated furnace filters into a cube with airflow arrows pointing inward.',
        'Seal a cardboard base and mount a 20-inch box fan on top blowing upward.',
        'Place in the main living area away from walls and run on low-medium continuously during smog alerts.',
      ],
      pm25ReductionNote: 'Removes 85-92% of indoor PM2.5 within 45 minutes in a 40 m² living room.',
      cadrOrEfficiencyGain: '350-450 CFM effective CADR (~$65 total build)',
    },
    {
      id: 'hack-2',
      costTier: 'Free',
      title: 'Back-Burner + Lid-On + 15-Minute Post-Cook Exhaust Rule',
      setupSteps: [
        'Cook on rear stove burners where range hood capture efficiency is highest.',
        'Keep lids on boiling pots and run the exhaust fan 15 minutes after turning off heat.',
        'Avoid high-heat pan searing or aerosol sprays on red-air days.',
      ],
      pm25ReductionNote: 'Cuts indoor cooking PM2.5 and NO2 peaks by up to 65%.',
      cadrOrEfficiencyGain: 'Zero equipment cost; immediate indoor spike prevention',
    },
    {
      id: 'hack-3',
      costTier: 'Free',
      title: 'Entryway Shoe-Off & Damp Microfiber Dust Trap',
      setupSteps: [
        'Leave outdoor winter boots and coats in a closed entryway bin to stop tracked road dust.',
        'Wipe sills and hard floors with a damp microfiber cloth instead of dry sweeping.',
      ],
      pm25ReductionNote: 'Prevents resuspension of heavy winter road particulates settled indoors.',
      cadrOrEfficiencyGain: '15-20% lower coarse & fine indoor dust resuspension',
    },
    {
      id: 'hack-4',
      costTier: 'Moderate',
      title: 'Silicone Door Sweep & Window Weatherstrip Sealing',
      setupSteps: [
        'Identify cold drafts around street-facing window sashes and front door frames.',
        'Apply V-seal foam or silicone weatherstripping and install a rubber door sweep.',
      ],
      pm25ReductionNote: 'Lowers passive outdoor smog infiltration by 25-35% while retaining indoor heat.',
      cadrOrEfficiencyGain: 'Dual thermal savings (~10% heating fuel drop) + smog barrier',
    },
  ],
  alternatives: [
    {
      id: 'alt-1',
      category: 'Commute & Errands',
      currentHabit: 'Solo gas SUV trips for school run and short local errands',
      sustainableAlternative: 'Consolidated 2-day errand loop + neighborhood carpool or electric transit feeder',
      weeklyCo2SavedKg: 14.8,
      householdBenefit: 'Cuts cold-start tailpipe particulates near school zones and saves ~$18/week in fuel.',
    },
    {
      id: 'alt-2',
      category: 'Home Heating',
      currentHabit: 'Constant 22°C gas furnace heating with drafty window frames',
      sustainableAlternative: 'Weatherstripped 19.5°C daytime / 17.5°C night schedule with zoned heat-pump or electric throw',
      weeklyCo2SavedKg: 11.2,
      householdBenefit: 'Lowers indoor dry-air irritation and cuts monthly winter heating utility bills by 14-18%.',
    },
    {
      id: 'alt-3',
      category: 'Cooking & Appliances',
      currentHabit: 'Daily high-heat gas stovetop cooking and scented paraffin candles',
      sustainableAlternative: 'Electric kettle/air-fryer/induction burner + beeswax or unscented LED lighting',
      weeklyCo2SavedKg: 5.4,
      householdBenefit: 'Eliminates indoor soot, benzene, and NO2 spikes during sealed winter days.',
    },
  ],
  impactMetrics: {
    dailyPm25ExposureReductionPct: 38,
    weeklyCo2SavedKg: 31.4,
    cleanAirHoursGainedPerDay: 6.5,
    communityEquivalentNote:
      'If 25 households on a block adopt these winter routine shifts, local cold-start traffic & heating emissions drop by roughly 785 kg CO2e every week.',
  },
};
