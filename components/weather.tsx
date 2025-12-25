'use client';

import cx from 'classnames';
import { format, isWithinInterval } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
} from 'lucide-react';

interface WeatherAtLocation {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    weather_code?: number;
    relative_humidity_2m?: string;
    apparent_temperature?: string;
    precipitation?: string;
    wind_speed_10m?: string;
    wind_direction_10m?: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    is_day?: number;
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
    precipitation_probability?: string;
    weather_code?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
  };
  daily_units: {
    time: string;
    sunrise: string;
    sunset: string;
    temperature_2m_max?: string;
    temperature_2m_min?: string;
    precipitation_probability_max?: string;
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
    precipitation_probability_max?: number[];
  };
  weather_code_interpretation?: {
    current?: string;
    daily?: string[];
  };
}

// Sample data for display purposes - this will be replaced with actual API data
const SAMPLE = {
  latitude: 37.763283,
  longitude: -122.41286,
  generationtime_ms: 0.027894973754882812,
  utc_offset_seconds: 0,
  timezone: 'GMT',
  timezone_abbreviation: 'GMT',
  elevation: 18,
  current_units: { 
    time: 'iso8601', 
    interval: 'seconds', 
    temperature_2m: '°C',
    relative_humidity_2m: '%',
    apparent_temperature: '°C',
    wind_speed_10m: 'km/h',
  },
  current: { 
    time: '2024-10-07T19:30', 
    interval: 900, 
    temperature_2m: 29.3,
    weather_code: 1,
    relative_humidity_2m: 42,
    apparent_temperature: 28.5,
    precipitation: 0,
    wind_speed_10m: 15,
    wind_direction_10m: 180,
    is_day: 1,
  },
  hourly_units: { time: 'iso8601', temperature_2m: '°C', precipitation_probability: '%' },
  hourly: {
    time: [
      '2024-10-07T00:00',
      '2024-10-07T01:00',
      '2024-10-07T02:00',
      '2024-10-07T03:00',
      '2024-10-07T04:00',
      '2024-10-07T05:00',
      '2024-10-07T06:00',
    ],
    temperature_2m: [
      36.6, 32.8, 29.5, 28.6, 29.2, 28.2, 27.5
    ],
    precipitation_probability: [
      0, 5, 10, 15, 0, 0, 0
    ],
    weather_code: [
      0, 1, 2, 3, 0, 1, 2
    ]
  },
  daily_units: {
    time: 'iso8601',
    sunrise: 'iso8601',
    sunset: 'iso8601',
    temperature_2m_max: '°C',
    temperature_2m_min: '°C',
    precipitation_probability_max: '%',
  },
  daily: {
    time: [
      '2024-10-07',
      '2024-10-08',
      '2024-10-09',
      '2024-10-10',
      '2024-10-11',
    ],
    sunrise: [
      '2024-10-07T07:15',
      '2024-10-08T07:16',
      '2024-10-09T07:17',
      '2024-10-10T07:18',
      '2024-10-11T07:19',
    ],
    sunset: [
      '2024-10-07T19:00',
      '2024-10-08T18:58',
      '2024-10-09T18:57',
      '2024-10-10T18:55',
      '2024-10-11T18:54',
    ],
    temperature_2m_max: [33.9, 22.3, 21.6, 21.0, 19.5],
    temperature_2m_min: [25.0, 13.3, 14.7, 15.4, 16.1],
    weather_code: [1, 2, 3, 80, 95],
    precipitation_probability_max: [0, 20, 60, 80, 30],
  },
  weather_code_interpretation: {
    current: 'Mainly clear',
    daily: [
      'Mainly clear', 
      'Partly cloudy', 
      'Overcast', 
      'Slight rain showers', 
      'Thunderstorm'
    ]
  }
};

function n(num: number): number {
  return Math.ceil(num);
}

// Map weather codes to appropriate icons
function WeatherIcon({ 
  weatherCode = 0, 
  isDay = true, 
  size = 24
}: { 
  weatherCode?: number;
  isDay?: boolean; 
  size?: number;
}) {
  // Weather codes from WMO (World Meteorological Organization)
  // https://open-meteo.com/en/docs
  switch(weatherCode) {
    case 0: // Clear sky
      return isDay ? <Sun size={size} className="text-yellow-300" /> : <Sun size={size} className="text-indigo-100" />;
    case 1: // Mainly clear
      return isDay ? <CloudSun size={size} className="text-yellow-300" /> : <CloudSun size={size} className="text-indigo-100" />;
    case 2: // Partly cloudy
      return <Cloud size={size} className={isDay ? "text-gray-200" : "text-indigo-100"} />;
    case 3: // Overcast
      return <Cloud size={size} className={isDay ? "text-gray-400" : "text-indigo-200"} />;
    case 45: // Fog
    case 48: // Depositing rime fog
      return <CloudFog size={size} className={isDay ? "text-gray-300" : "text-indigo-200"} />;
    case 51: // Light drizzle
    case 53: // Moderate drizzle
    case 55: // Dense drizzle
      return <CloudDrizzle size={size} className={isDay ? "text-blue-300" : "text-indigo-200"} />;
    case 61: // Slight rain
    case 63: // Moderate rain
    case 65: // Heavy rain
    case 80: // Slight rain showers
    case 81: // Moderate rain showers
    case 82: // Violent rain showers
      return <CloudRain size={size} className={isDay ? "text-blue-400" : "text-indigo-200"} />;
    case 71: // Slight snow fall
    case 73: // Moderate snow fall
    case 75: // Heavy snow fall
    case 77: // Snow grains
    case 85: // Slight snow showers
    case 86: // Heavy snow showers
      return <CloudSnow size={size} className="text-blue-100" />;
    case 95: // Thunderstorm
    case 96: // Thunderstorm with slight hail
    case 99: // Thunderstorm with heavy hail
      return <CloudLightning size={size} className={isDay ? "text-yellow-400" : "text-indigo-100"} />;
    default:
      return isDay ? <Sun size={size} className="text-yellow-300" /> : <Sun size={size} className="text-indigo-100" />;
  }
}

// Format the location name from coordinates
function formatLocationName(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
}

export function Weather({
  weatherAtLocation = SAMPLE,
}: {
  weatherAtLocation?: WeatherAtLocation;
}) {
  const currentHigh = weatherAtLocation.daily?.temperature_2m_max?.[0] || 
    Math.max(...weatherAtLocation.hourly.temperature_2m.slice(0, 24));
    
  const currentLow = weatherAtLocation.daily?.temperature_2m_min?.[0] || 
    Math.min(...weatherAtLocation.hourly.temperature_2m.slice(0, 24));

  const isDay = weatherAtLocation.current?.is_day === 1 || 
    isWithinInterval(new Date(weatherAtLocation.current.time), {
      start: new Date(weatherAtLocation.daily.sunrise[0]),
      end: new Date(weatherAtLocation.daily.sunset[0]),
    });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hoursToShow = isMobile ? 5 : 6;
  const daysToShow = isMobile ? 3 : 5;

  // Find the index of the current time or the next closest time
  const currentTimeIndex = weatherAtLocation.hourly.time.findIndex(
    (time) => new Date(time) >= new Date(weatherAtLocation.current.time),
  );

  // Slice the arrays to get the desired number of items
  const displayTimes = weatherAtLocation.hourly.time.slice(
    currentTimeIndex,
    currentTimeIndex + hoursToShow,
  );
  const displayTemperatures = weatherAtLocation.hourly.temperature_2m.slice(
    currentTimeIndex,
    currentTimeIndex + hoursToShow,
  );
  const displayWeatherCodes = weatherAtLocation.hourly.weather_code?.slice(
    currentTimeIndex,
    currentTimeIndex + hoursToShow,
  ) || Array(hoursToShow).fill(1);
  const displayPrecipProbs = weatherAtLocation.hourly.precipitation_probability?.slice(
    currentTimeIndex,
    currentTimeIndex + hoursToShow,
  ) || Array(hoursToShow).fill(0);

  // Current weather description
  const currentWeatherDescription = weatherAtLocation.weather_code_interpretation?.current || 
    getWeatherDescription(weatherAtLocation.current.weather_code || 0);

  const cardBackgroundClass = isDay 
    ? 'bg-gradient-to-br from-blue-400 to-blue-500'
    : 'bg-gradient-to-br from-indigo-900 to-indigo-800';

  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-2xl p-5 shadow-lg w-full border border-opacity-20',
        cardBackgroundClass
      )}
    >
      {/* Location and current weather section */}
      <div className="flex flex-row justify-between items-center pb-2 border-b border-white/20">
        <div className="flex flex-col">
          <div className="text-blue-100 font-medium">
            {formatLocationName(weatherAtLocation.latitude, weatherAtLocation.longitude)}
          </div>
          <div className="text-blue-50 text-sm">
            {format(new Date(weatherAtLocation.current.time), 'EEEE, MMM d, h:mm a')}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
          <WeatherIcon weatherCode={weatherAtLocation.current.weather_code} isDay={isDay} size={16} />
          <span className="text-blue-50 text-sm">{currentWeatherDescription}</span>
        </div>
      </div>

      {/* Temperature and conditions */}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row items-center gap-4">
          <WeatherIcon weatherCode={weatherAtLocation.current.weather_code} isDay={isDay} size={48} />
          <div className="flex flex-col">
            <div className="text-4xl font-semibold text-white">
              {n(weatherAtLocation.current.temperature_2m)}
              {weatherAtLocation.current_units.temperature_2m}
            </div>
            <div className="text-blue-100 text-sm">
              Feels like: {n(weatherAtLocation.current.apparent_temperature || weatherAtLocation.current.temperature_2m)}
              {weatherAtLocation.current_units.apparent_temperature || weatherAtLocation.current_units.temperature_2m}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end text-blue-50 text-sm bg-white/10 p-2 rounded-lg">
          <div className="font-medium">{`H: ${n(currentHigh)}° L: ${n(currentLow)}°`}</div>
          {weatherAtLocation.current.relative_humidity_2m && (
            <div className="flex gap-1 items-center">
              <Droplets size={12} /> {weatherAtLocation.current.relative_humidity_2m}%
            </div>
          )}
          {weatherAtLocation.current.wind_speed_10m && (
            <div className="flex gap-1 items-center">
              <Wind size={12} /> {weatherAtLocation.current.wind_speed_10m} 
              {weatherAtLocation.current_units.wind_speed_10m}
            </div>
          )}
        </div>
      </div>

      {/* Hourly forecast */}
      <div className="bg-white/10 p-3 rounded-xl">
        <h3 className="text-blue-50 text-sm font-medium mb-2">Next {hoursToShow} Hours</h3>
        <div className="flex flex-row justify-between">
          {displayTimes.map((time, index) => (
            <div key={time} className="flex flex-col items-center gap-1 p-1 rounded-lg">
              <div className="text-blue-100 text-xs font-medium">
                {format(new Date(time), 'ha')}
              </div>
              <WeatherIcon 
                weatherCode={displayWeatherCodes[index]} 
                isDay={isDay} 
                size={20} 
              />
              <div className="text-blue-50 text-sm font-medium">
                {n(displayTemperatures[index])}°
              </div>
              {displayPrecipProbs[index] > 0 && (
                <div className="flex items-center gap-0.5 text-xs text-blue-100">
                  <Droplets size={10} className="text-blue-200" />
                  {displayPrecipProbs[index]}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily forecast */}
      {weatherAtLocation.daily && (
        <div className="bg-white/10 p-3 rounded-xl">
          <h3 className="text-blue-50 text-sm font-medium mb-2">Next {daysToShow} Days</h3>
          <div className="flex flex-col gap-2">
            {weatherAtLocation.daily.time.slice(0, daysToShow).map((day, index) => (
              <div key={day} className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 min-w-[90px]">
                  <WeatherIcon 
                    weatherCode={weatherAtLocation.daily.weather_code?.[index] || 0} 
                    size={20} 
                    isDay={true} 
                  />
                  <div className="text-blue-50 font-medium">
                    {index === 0 ? 'Today' : format(new Date(day), 'EEE')}
                  </div>
                </div>
                
                <div className="grow px-4">
                  {weatherAtLocation.daily.precipitation_probability_max && (
                    <div className="flex items-center gap-1">
                      <Droplets size={12} className="text-blue-200" />
                      <span className="text-xs text-blue-100">
                        {weatherAtLocation.daily.precipitation_probability_max[index]}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-sm">
                  <span className="text-blue-50 font-medium">
                    {weatherAtLocation.daily.temperature_2m_max && n(weatherAtLocation.daily.temperature_2m_max[index])}°
                  </span>
                  <span className="text-blue-200 ml-2">
                    {weatherAtLocation.daily.temperature_2m_min && n(weatherAtLocation.daily.temperature_2m_min[index])}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sunrise/sunset information */}
      <div className="flex justify-between items-center text-xs text-blue-100 pt-1">
        <div>
          Sunrise: {format(new Date(weatherAtLocation.daily.sunrise[0]), 'h:mm a')}
        </div>
        <div>
          Sunset: {format(new Date(weatherAtLocation.daily.sunset[0]), 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

// Helper function to get weather descriptions
function getWeatherDescription(weatherCode: number): string {
  const weatherCodeMeanings: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  
  return weatherCodeMeanings[weatherCode] || 'Unknown';
}
