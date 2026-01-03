import { tool } from 'ai';
import { z } from 'zod';

export const getWeather = tool({
  description:
    'Get detailed weather information for a location using Open Meteo API',
  inputSchema: z.object({
    latitude: z.number().describe('Latitude of the location'),
    longitude: z.number().describe('Longitude of the location'),
    timezone: z
      .string()
      .optional()
      .describe('Timezone (e.g., "auto", "Europe/Berlin", "America/New_York")'),
    temperature_unit: z
      .enum(['celsius', 'fahrenheit'])
      .optional()
      .describe('Temperature unit (default: celsius)'),
    wind_speed_unit: z
      .enum(['kmh', 'ms', 'mph', 'kn'])
      .optional()
      .describe('Wind speed unit (default: kmh)'),
    precipitation_unit: z
      .enum(['mm', 'inch'])
      .optional()
      .describe('Precipitation unit (default: mm)'),
    forecast_days: z
      .number()
      .min(1)
      .max(16)
      .optional()
      .describe('Number of forecast days (1-16, default: 7)'),
  }),
  execute: async ({
    latitude,
    longitude,
    timezone = 'auto',
    temperature_unit = 'celsius',
    wind_speed_unit = 'kmh',
    precipitation_unit = 'mm',
    forecast_days = 7,
  }) => {
    const url = new URL('https://api.open-meteo.com/v1/forecast');

    // Set basic parameters
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('timezone', timezone);
    url.searchParams.set('temperature_unit', temperature_unit);
    url.searchParams.set('wind_speed_unit', wind_speed_unit);
    url.searchParams.set('precipitation_unit', precipitation_unit);
    url.searchParams.set('forecast_days', forecast_days.toString());

    // Set current weather variables - comprehensive set
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'pressure_msl',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
    );

    // Set hourly weather variables - most important ones
    url.searchParams.set(
      'hourly',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'dew_point_2m',
        'apparent_temperature',
        'precipitation_probability',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'snow_depth',
        'weather_code',
        'cloud_cover',
        'visibility',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'uv_index',
        'uv_index_clear_sky',
      ].join(','),
    );

    // Set daily weather variables - comprehensive set
    url.searchParams.set(
      'daily',
      [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'sunrise',
        'sunset',
        'daylight_duration',
        'sunshine_duration',
        'uv_index_max',
        'uv_index_clear_sky_max',
        'precipitation_sum',
        'rain_sum',
        'showers_sum',
        'snowfall_sum',
        'precipitation_hours',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'wind_direction_10m_dominant',
        'shortwave_radiation_sum',
      ].join(','),
    );

    try {
      console.log(
        `Fetching weather data for coordinates: ${latitude}, ${longitude}`,
      );
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Weather API error: ${response.status} - ${errorText}`);
        return {
          error: `Failed to fetch weather data: ${response.status}`,
          message: errorText,
        };
      }

      const weatherData = await response.json();

      // Add weather code interpretation for better usability
      weatherData.weather_code_interpretation = interpretWeatherCodes(
        weatherData.current?.weather_code,
        weatherData.daily?.weather_code,
        weatherData.hourly?.weather_code,
      );

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return {
        error: 'Failed to fetch weather data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Interpret WMO weather codes and provide human-readable descriptions
 */
function interpretWeatherCodes(
  currentCode?: number,
  dailyCodes?: number[],
  hourlyCodes?: number[],
) {
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
    99: 'Thunderstorm with heavy hail',
  };

  // Define a specific type for weather interpretations
  interface WeatherInterpretation {
    current?: string;
    daily?: string[];
    hourly?: string[];
  }

  const interpretation: WeatherInterpretation = {};

  // Interpret current weather code
  if (currentCode !== undefined) {
    interpretation.current = weatherCodeMeanings[currentCode] || 'Unknown';
  }

  // Interpret daily weather codes - using optional chaining
  if (dailyCodes?.length) {
    interpretation.daily = dailyCodes.map(
      (code) => weatherCodeMeanings[code] || 'Unknown',
    );
  }

  // Interpret hourly weather codes - using optional chaining
  if (hourlyCodes?.length) {
    interpretation.hourly = hourlyCodes.map(
      (code) => weatherCodeMeanings[code] || 'Unknown',
    );
  }

  return interpretation;
}
