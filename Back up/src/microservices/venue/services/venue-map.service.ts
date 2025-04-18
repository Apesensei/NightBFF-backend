import { Injectable, Logger } from "@nestjs/common";
import {
  VenueRepository,
  VenueSearchOptions,
} from "../repositories/venue.repository";
import { GoogleMapsService } from "./google-maps.service";
import { Venue } from "../entities/venue.entity";
import { VenueType } from "../entities/venue-type.entity";
import { VenueSearchDto, VenueSortBy } from "../dto/venue-search.dto";
import { VenueTypeRepository } from "../repositories/venue-type.repository";
import { VenueStatus } from "../entities/venue.entity";

@Injectable()
export class VenueMapService {
  private readonly logger = new Logger(VenueMapService.name);

  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly venueTypeRepository: VenueTypeRepository,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  /**
   * Search venues based on location, radius, and other search criteria
   * Requires latitude and longitude.
   */
  async searchVenues(
    searchDto: VenueSearchDto,
  ): Promise<{ venues: Venue[]; total: number }> {
    // --- START: Add validation for required coordinates ---
    if (searchDto.latitude === undefined || searchDto.longitude === undefined) {
      this.logger.warn(
        "VenueMapService.searchVenues called without required latitude/longitude.",
      );
      // Option 1: Return empty results gracefully
      return { venues: [], total: 0 };
      // Option 2: Throw an error (if this service should ONLY be called with coords)
      // throw new BadRequestException('Latitude and Longitude are required for map search.');
    }
    // --- END: Add validation ---

    try {
      // --- Construct options object ---
      const options: VenueSearchOptions = {
        latitude: searchDto.latitude, // Already checked they exist
        longitude: searchDto.longitude,
        radiusMiles: searchDto.radius, // Use radius from DTO
        query: searchDto.query,
        venueTypeIds: searchDto.venueTypes,
        sortBy: searchDto.sortBy,
        order: searchDto.order,
        openNow: searchDto.openNow,
        priceLevel: searchDto.priceLevel,
        limit: searchDto.limit, // Pass pagination from DTO
        offset: searchDto.offset,
      };
      // --- Call repository with single options object ---
      const [venues, total] = await this.venueRepository.search(options);

      return { venues, total };
    } catch (error) {
      this.logger.error(
        `Failed to search venues: ${error.message}`,
        error.stack,
      );
      // Consider re-throwing specific errors if needed
      return { venues: [], total: 0 }; // Graceful fallback
    }
  }

  /**
   * Geocode an address to coordinates for venue search
   */
  async geocodeAddress(
    address: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const result = await this.googleMapsService.geocodeAddress(address);
      if (result) {
        return {
          latitude: result.latitude,
          longitude: result.longitude,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to geocode address: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get venues near a specific location
   */
  async getVenuesNearLocation(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20,
  ): Promise<Venue[]> {
    try {
      // --- Construct options object ---
      const options: VenueSearchOptions = {
        latitude,
        longitude,
        radiusMiles: radius,
        sortBy: VenueSortBy.DISTANCE, // Explicitly sort by distance
        order: "ASC",
        limit,
        offset: 0,
      };
      // --- Call repository with single options object ---
      const [venues] = await this.venueRepository.search(options);
      return venues;
    } catch (error) {
      this.logger.error(
        `Failed to get venues near location: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get all venue types for filtering
   */
  async getVenueTypes(): Promise<VenueType[]> {
    try {
      return await this.venueTypeRepository.findAll();
    } catch (error) {
      this.logger.error(
        `Failed to get venue types: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Import venues from Google Places API based on venue type
   * This is an admin operation to populate venues in a new area
   */
  async importVenuesFromGoogle(
    latitude: number,
    longitude: number,
    radius: number,
    venueType: string,
  ): Promise<number> {
    try {
      const places = await this.googleMapsService.searchNearby(
        latitude,
        longitude,
        radius,
        venueType,
      );

      let importedCount = 0;
      for (const place of places) {
        // Check if venue already exists by place_id
        const existingVenue = await this.venueRepository.findByGooglePlaceId(
          place.place_id,
        );
        if (existingVenue) {
          continue;
        }

        // Get more details about the place
        const placeDetails = await this.googleMapsService.getPlaceDetails(
          place.place_id,
        );
        if (!placeDetails) {
          continue;
        }

        // Find appropriate venue type(s)
        const venueTypes = await this.mapGoogleTypesToVenueTypes(
          placeDetails.types || [],
        );

        // Create new venue
        const venueData: Partial<Venue> = {
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          latitude: placeDetails.geometry.location.lat,
          longitude: placeDetails.geometry.location.lng,
          googlePlaceId: placeDetails.place_id,
          googleRating: placeDetails.rating,
          googleRatingsTotal: placeDetails.user_ratings_total,
          priceLevel: placeDetails.price_level,
          website: placeDetails.website,
          phone: placeDetails.formatted_phone_number,
          isOpenNow: placeDetails.opening_hours?.open_now,
          venueTypes: venueTypes,
          status: VenueStatus.PENDING,
        };

        await this.venueRepository.create(venueData);
        importedCount++;
      }

      return importedCount;
    } catch (error) {
      this.logger.error(
        `Failed to import venues from Google: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Map Google place types to our venue types
   */
  private async mapGoogleTypesToVenueTypes(
    googleTypes: string[],
  ): Promise<VenueType[]> {
    const typeMapping: Record<string, string> = {
      bar: "Bar",
      night_club: "Nightclub",
      restaurant: "Restaurant",
      cafe: "Café",
      casino: "Casino",
      movie_theater: "Entertainment",
      amusement_park: "Entertainment",
      bowling_alley: "Entertainment",
    };

    const venueTypeNames = new Set<string>();
    for (const googleType of googleTypes) {
      if (typeMapping[googleType]) {
        venueTypeNames.add(typeMapping[googleType]);
      }
    }

    if (venueTypeNames.size === 0) {
      venueTypeNames.add("Other");
    }

    return await this.venueTypeRepository.findByNames(
      Array.from(venueTypeNames),
    );
  }
}
