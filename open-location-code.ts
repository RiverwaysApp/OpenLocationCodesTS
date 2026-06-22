export class OpenLocationCode {

    /**
   * Provides a normal precision code, approximately 14x14 meters.
   */
    private static CODE_PRECISION_NORMAL = 10;

    /**
     * Provides an extra precision code, approximately 2x3 meters.
     */
    private static CODE_PRECISION_EXTRA = 11;

    // A separator used to break the code into two parts to aid memorability.
    private static SEPARATOR_ = '+';

    // The number of characters to place before the separator.
    private static SEPARATOR_POSITION_ = 8;

    // The character used to pad codes.
    private static PADDING_CHARACTER_ = '0';

    // The character set used to encode the values.
    private static CODE_ALPHABET_ = '23456789CFGHJMPQRVWX';

    // The base to use to convert numbers to/from.
    private static ENCODING_BASE_ = this.CODE_ALPHABET_.length;

    // The maximum value for latitude in degrees.
    public static LATITUDE_MAX_ = 90;

    // The maximum value for longitude in degrees.
    public static LONGITUDE_MAX_ = 180;

    // The min number of digits in a Plus Code.
    private static MIN_DIGIT_COUNT_ = 2;

    // The max number of digits to process in a Plus Code.
    private static MAX_DIGIT_COUNT_ = 15;

    // Maximum code length using lat/lng pair encoding. The area of such a
    // code is approximately 13x13 meters (at the equator), and should be suitable
    // for identifying buildings. This excludes prefix and separator characters.
    private static PAIR_CODE_LENGTH_ = 10;

    // First place value of the pairs (if the last pair value is 1).
    private static PAIR_FIRST_PLACE_VALUE_ = Math.pow(
        this.ENCODING_BASE_, (this.PAIR_CODE_LENGTH_ / 2 - 1));

    // Inverse of the precision of the pair section of the code.
    private static PAIR_PRECISION_ = Math.pow(this.ENCODING_BASE_, 3);

    // The resolution values in degrees for each position in the lat/lng pair
    // encoding. These give the place value of each position, and therefore the
    // dimensions of the resulting area.
    private static PAIR_RESOLUTIONS_ = [20.0, 1.0, .05, .0025, .000125];

    // Number of digits in the grid precision part of the code.
    private static GRID_CODE_LENGTH_ = this.MAX_DIGIT_COUNT_ - this.PAIR_CODE_LENGTH_;

    // Number of columns in the grid refinement method.
    private static GRID_COLUMNS_ = 4;

    // Number of rows in the grid refinement method.
    private static GRID_ROWS_ = 5;

    // First place value of the latitude grid (if the last place is 1).
    private static GRID_LAT_FIRST_PLACE_VALUE_ = Math.pow(
        this.GRID_ROWS_, (this.GRID_CODE_LENGTH_ - 1));

    // First place value of the longitude grid (if the last place is 1).
    private static GRID_LNG_FIRST_PLACE_VALUE_ = Math.pow(
        this.GRID_COLUMNS_, (this.GRID_CODE_LENGTH_ - 1));

    // Multiply latitude by this much to make it a multiple of the finest
    // precision.
    private static FINAL_LAT_PRECISION_ = this.PAIR_PRECISION_ *
        Math.pow(this.GRID_ROWS_, (this.MAX_DIGIT_COUNT_ - this.PAIR_CODE_LENGTH_));

    // Multiply longitude by this much to make it a multiple of the finest
    // precision.
    private static FINAL_LNG_PRECISION_ = this.PAIR_PRECISION_ *
        Math.pow(this.GRID_COLUMNS_, (this.MAX_DIGIT_COUNT_ - this.PAIR_CODE_LENGTH_));

    // Minimum length of a code that can be shortened.
    private static MIN_TRIMMABLE_CODE_LEN_ = 6;


    /**
    @return {string} Returns the OLC alphabet.
     */
    public static getAlphabet() {
        return this.CODE_ALPHABET_;
    }

    /**
   * Determines if a code is valid.
   *
   * To be valid, all characters must be from the Open Location Code character
   * set with at most one separator. The separator can be in any even-numbered
   * position up to the eighth digit.
   *
   * @param {string} code The string to check.
   * @return {boolean} True if the string is a valid code.
   */
    public static isValid(code: string): boolean {
        if (!code || typeof code !== 'string') {
            return false;
        }
        // The separator is required.
        if (code.indexOf(this.SEPARATOR_) == -1) {
            return false;
        }
        if (code.indexOf(this.SEPARATOR_) != code.lastIndexOf(this.SEPARATOR_)) {
            return false;
        }
        // Is it the only character?
        if (code.length == 1) {
            return false;
        }
        // Is it in an illegal position?
        if (code.indexOf(this.SEPARATOR_) > this.SEPARATOR_POSITION_ ||
            code.indexOf(this.SEPARATOR_) % 2 == 1) {
            return false;
        }
        // We can have an even number of padding characters before the separator,
        // but then it must be the final character.
        if (code.indexOf(this.PADDING_CHARACTER_) > -1) {
            // Short codes cannot have padding
            if (code.indexOf(this.SEPARATOR_) < this.SEPARATOR_POSITION_) {
                return false;
            }
            // Not allowed to start with them!
            if (code.indexOf(this.PADDING_CHARACTER_) == 0) {
                return false;
            }
            // There can only be one group and it must have even length.
            const padMatch = code.match(new RegExp('(' + this.PADDING_CHARACTER_ + '+)', 'g'));

            if (padMatch === null) return false;

            if (padMatch.length > 1 || padMatch[0].length % 2 == 1 ||
                padMatch[0].length > this.SEPARATOR_POSITION_ - 2) {
                return false;
            }
            // If the code is long enough to end with a separator, make sure it does.
            if (code.charAt(code.length - 1) != this.SEPARATOR_) {
                return false;
            }
        }
        // If there are characters after the separator, make sure there isn't just
        // one of them (not legal).
        if (code.length - code.indexOf(this.SEPARATOR_) - 1 == 1) {
            return false;
        }

        // Strip the separator and any padding characters.
        code = code.replace(new RegExp('\\' + this.SEPARATOR_ + '+'), '')
            .replace(new RegExp(this.PADDING_CHARACTER_ + '+'), '');
        // Check the code contains only valid characters.
        for (var i = 0, len = code.length; i < len; i++) {
            var character = code.charAt(i).toUpperCase();
            if (character != this.SEPARATOR_ && this.CODE_ALPHABET_.indexOf(character) == -1) {
                return false;
            }
        }
        return true;
    }

    /**
   * Determines if a code is a valid short code.
   *
   * @param {string} code The string to check.
   * @return {boolean} True if the string can be produced by removing four or
   *     more characters from the start of a valid code.
   */
    public static isShort(code: string): boolean {
        // Check it's valid.
        if (!this.isValid(code)) {
            return false;
        }
        // If there are less characters than expected before the SEPARATOR.
        if (code.indexOf(this.SEPARATOR_) >= 0 &&
            code.indexOf(this.SEPARATOR_) < this.SEPARATOR_POSITION_) {
            return true;
        }
        return false;
    }

    /**
   * Determines if a code is a valid full Open Location Code.
   *
   * @param {string} code The string to check.
   * @return {boolean} True if the code represents a valid latitude and
   *     longitude combination.
   */
    public static isFull(code: string): boolean {
        if (!this.isValid(code)) {
            return false;
        }
        // If it's short, it's not full.
        if (this.isShort(code)) {
            return false;
        }

        // Work out what the first latitude character indicates for latitude.
        var firstLatValue = this.CODE_ALPHABET_.indexOf(
            code.charAt(0).toUpperCase()) * this.ENCODING_BASE_;
        if (firstLatValue >= this.LATITUDE_MAX_ * 2) {
            // The code would decode to a latitude of >= 90 degrees.
            return false;
        }
        if (code.length > 1) {
            // Work out what the first longitude character indicates for longitude.
            var firstLngValue = this.CODE_ALPHABET_.indexOf(
                code.charAt(1).toUpperCase()) * this.ENCODING_BASE_;
            if (firstLngValue >= this.LONGITUDE_MAX_ * 2) {
                // The code would decode to a longitude of >= 180 degrees.
                return false;
            }
        }
        return true;
    }

    /**
  * Encode a location into an Open Location Code.
  *
  * @param {number} latitude The latitude in signed decimal degrees. It will
  *     be clipped to the range -90 to 90.
  * @param {number} longitude The longitude in signed decimal degrees. Will be
  *     normalised to the range -180 to 180.
  * @param {?number} codeLength The length of the code to generate. If
  *     omitted, the value OpenLocationCode.CODE_PRECISION_NORMAL will be used.
  *     For a more precise result, OpenLocationCode.CODE_PRECISION_EXTRA is
  *     recommended.
  * @return {string} The code.
  * @throws {Exception} if any of the input values are not numbers.
  */
    public static encode(latitude: number, longitude: number, codeLength?: number) {
        latitude = Number(latitude);
        longitude = Number(longitude);

        const locationIntegers = this.locationToIntegers(latitude, longitude);

        return this.encodeIntegers(locationIntegers[0], locationIntegers[1], codeLength || this.CODE_PRECISION_NORMAL);
    }

    /**
   * Convert a latitude, longitude location into integer values.
   *
   * This function is only exposed for testing.
   *
   * Latitude is converted into a positive integer clipped into the range
   * 0 <= X < 180*2.5e7. (Latitude 90 needs to be adjusted to be slightly lower,
   * so that the returned code can also be decoded.
   * Longitude is converted into a positive integer and normalised into the range
   * 0 <= X < 360*8.192e6.

   * @param {number} latitude
   * @param {number} longitude
   * @return {Array<number>} A tuple of the latitude integer and longitude integer.
   */
    public static locationToIntegers(latitude: number, longitude: number): [number, number] {
        var latVal = Math.floor(latitude * this.FINAL_LAT_PRECISION_);
        latVal += this.LATITUDE_MAX_ * this.FINAL_LAT_PRECISION_;
        if (latVal < 0) {
            latVal = 0;
        } else if (latVal >= 2 * this.LATITUDE_MAX_ * this.FINAL_LAT_PRECISION_) {
            latVal = 2 * this.LATITUDE_MAX_ * this.FINAL_LAT_PRECISION_ - 1;
        }
        var lngVal = Math.floor(longitude * this.FINAL_LNG_PRECISION_);
        lngVal += this.LONGITUDE_MAX_ * this.FINAL_LNG_PRECISION_;
        if (lngVal < 0) {
            lngVal =
                (lngVal % (2 * this.LONGITUDE_MAX_ * this.FINAL_LNG_PRECISION_)) +
                2 * this.LONGITUDE_MAX_ * this.FINAL_LNG_PRECISION_;
        } else if (lngVal >= 2 * this.LONGITUDE_MAX_ * this.FINAL_LNG_PRECISION_) {
            lngVal = lngVal % (2 * this.LONGITUDE_MAX_ * this.FINAL_LNG_PRECISION_);
        }
        return [latVal, lngVal];
    }

    /**
     * Encode a location that uses integer values into an Open Location Code.
     *
     * This is a testing function, and should not be called directly.
     *
     * @param {number} latInt An integer latitude.
     * @param {number} lngInt An integer longitude.
     * @param {number=} codeLength The number of significant digits in the output
     *     code, not including any separator characters.
     * @return {string} A code of the specified length or the default length if not
     *     specified.
     * @throws {Exception} if any of the input values are not numbers.
     */
    public static encodeIntegers(latInt: number, lngInt: number, codeLength: number) {
        if (typeof codeLength == 'undefined') {
            codeLength = OpenLocationCode.CODE_PRECISION_NORMAL;
        } else {
            codeLength = Math.min(this.MAX_DIGIT_COUNT_, Number(codeLength));
        }
        if (isNaN(latInt) || isNaN(lngInt) || isNaN(codeLength)) {
            throw new Error('ValueError: Parameters are not numbers');
        }
        if (codeLength < this.MIN_DIGIT_COUNT_ ||
            (codeLength < this.PAIR_CODE_LENGTH_ && codeLength % 2 == 1)) {
            throw new Error('IllegalArgumentException: Invalid Open Location Code length');
        }
        // Javascript strings are immutable and it doesn't have a native
        // StringBuilder, so we'll use an array.
        const code = new Array(this.MAX_DIGIT_COUNT_ + 1);
        code[this.SEPARATOR_POSITION_] = this.SEPARATOR_;

        // Compute the grid part of the code if necessary.
        if (codeLength > this.PAIR_CODE_LENGTH_) {
            for (var i = this.MAX_DIGIT_COUNT_ - this.PAIR_CODE_LENGTH_; i >= 1; i--) {
                var latDigit = latInt % this.GRID_ROWS_;
                var lngDigit = lngInt % this.GRID_COLUMNS_;
                var ndx = latDigit * this.GRID_COLUMNS_ + lngDigit;
                code[this.SEPARATOR_POSITION_ + 2 + i] = this.CODE_ALPHABET_.charAt(ndx);
                // Note! Integer division.
                latInt = Math.floor(latInt / this.GRID_ROWS_);
                lngInt = Math.floor(lngInt / this.GRID_COLUMNS_);
            }
        } else {
            latInt = Math.floor(latInt / Math.pow(this.GRID_ROWS_, this.GRID_CODE_LENGTH_));
            lngInt = Math.floor(lngInt / Math.pow(this.GRID_COLUMNS_, this.GRID_CODE_LENGTH_));
        }

        // Add the pair after the separator.
        code[this.SEPARATOR_POSITION_ + 1] = this.CODE_ALPHABET_.charAt(latInt % this.ENCODING_BASE_);
        code[this.SEPARATOR_POSITION_ + 2] = this.CODE_ALPHABET_.charAt(lngInt % this.ENCODING_BASE_);
        latInt = Math.floor(latInt / this.ENCODING_BASE_);
        lngInt = Math.floor(lngInt / this.ENCODING_BASE_);

        // Compute the pair section of the code.
        for (var i = this.PAIR_CODE_LENGTH_ / 2 + 1; i >= 0; i -= 2) {
            code[i] = this.CODE_ALPHABET_.charAt(latInt % this.ENCODING_BASE_);
            code[i + 1] = this.CODE_ALPHABET_.charAt(lngInt % this.ENCODING_BASE_);
            latInt = Math.floor(latInt / this.ENCODING_BASE_);
            lngInt = Math.floor(lngInt / this.ENCODING_BASE_);
        }

        // If we don't need to pad the code, return the requested section.
        if (codeLength >= this.SEPARATOR_POSITION_) {
            return code.slice(0, codeLength + 1).join('');
        }
        // Pad and return the code.
        return code.slice(0, codeLength).join('') +
            Array(this.SEPARATOR_POSITION_ - codeLength + 1).join(this.PADDING_CHARACTER_) + this.SEPARATOR_;
    }

    /**
     * Decodes an Open Location Code into its location coordinates.
     *
     * Returns a CodeArea object that includes the coordinates of the bounding
     * box - the lower left, center and upper right.
     *
     * @param {string} code The code to decode.
     * @return {OpenLocationCode.CodeArea} An object with the coordinates of the
     *     area of the code.
     * @throws {Exception} If the code is not valid.
     */
    public static decode(code: string) {
        // This calculates the values for the pair and grid section separately, using
        // integer arithmetic. Only at the final step are they converted to floating
        // point and combined.
        if (!this.isFull(code)) {
            throw new Error('IllegalArgumentException: ' +
                'Passed Plus Code is not a valid full code: ' + code);
        }
        // Strip the '+' and '0' characters from the code and convert to upper case.
        code = code.replace('+', '').replace(/0/g, '').toLocaleUpperCase('en-US');

        // Initialise the values for each section. We work them out as integers and
        // convert them to floats at the end.
        var normalLat = -this.LATITUDE_MAX_ * this.PAIR_PRECISION_;
        var normalLng = -this.LONGITUDE_MAX_ * this.PAIR_PRECISION_;
        var gridLat = 0;
        var gridLng = 0;
        // How many digits do we have to process?
        var digits = Math.min(code.length, this.PAIR_CODE_LENGTH_);
        // Define the place value for the most significant pair.
        var pv = this.PAIR_FIRST_PLACE_VALUE_;
        // Decode the paired digits.
        for (var i = 0; i < digits; i += 2) {
            normalLat += this.CODE_ALPHABET_.indexOf(code.charAt(i)) * pv;
            normalLng += this.CODE_ALPHABET_.indexOf(code.charAt(i + 1)) * pv;
            if (i < digits - 2) {
                pv /= this.ENCODING_BASE_;
            }
        }
        // Convert the place value to a float in degrees.
        var latPrecision = pv / this.PAIR_PRECISION_;
        var lngPrecision = pv / this.PAIR_PRECISION_;
        // Process any extra precision digits.
        if (code.length > this.PAIR_CODE_LENGTH_) {
            // Initialise the place values for the grid.
            var rowpv = this.GRID_LAT_FIRST_PLACE_VALUE_;
            var colpv = this.GRID_LNG_FIRST_PLACE_VALUE_;
            // How many digits do we have to process?
            digits = Math.min(code.length, this.MAX_DIGIT_COUNT_);
            for (var i = this.PAIR_CODE_LENGTH_; i < digits; i++) {
                var digitVal = this.CODE_ALPHABET_.indexOf(code.charAt(i));
                var row = Math.floor(digitVal / this.GRID_COLUMNS_);
                var col = digitVal % this.GRID_COLUMNS_;
                gridLat += row * rowpv;
                gridLng += col * colpv;
                if (i < digits - 1) {
                    rowpv /= this.GRID_ROWS_;
                    colpv /= this.GRID_COLUMNS_;
                }
            }
            // Adjust the precisions from the integer values to degrees.
            latPrecision = rowpv / this.FINAL_LAT_PRECISION_;
            lngPrecision = colpv / this.FINAL_LNG_PRECISION_;
        }
        // Merge the values from the normal and extra precision parts of the code.
        var lat = normalLat / this.PAIR_PRECISION_ + gridLat / this.FINAL_LAT_PRECISION_;
        var lng = normalLng / this.PAIR_PRECISION_ + gridLng / this.FINAL_LNG_PRECISION_;
        return new CodeArea(
            lat,
            lng,
            lat + latPrecision,
            lng + lngPrecision,
            Math.min(code.length, this.MAX_DIGIT_COUNT_));
    }

    /**
     * Recover the nearest matching code to a specified location.
     *
     * Given a valid short Open Location Code this recovers the nearest matching
     * full code to the specified location.
     *
     * @param {string} shortCode A valid short code.
     * @param {number} referenceLatitude The latitude to use for the reference
     *     location.
     * @param {number} referenceLongitude The longitude to use for the reference
     *     location.
     * @return {string} The nearest matching full code to the reference location.
     * @throws {Exception} if the short code is not valid, or the reference
     *     position values are not numbers.
     */
    public static recoverNearest(shortCode: string, referenceLatitude: number, referenceLongitude: number) {
        if (!this.isShort(shortCode)) {
            if (this.isFull(shortCode)) {
                return shortCode.toUpperCase();
            } else {
                throw new Error(
                    'ValueError: Passed short code is not valid: ' + shortCode);
            }
        }
        referenceLatitude = Number(referenceLatitude);
        referenceLongitude = Number(referenceLongitude);
        if (isNaN(referenceLatitude) || isNaN(referenceLongitude)) {
            throw new Error('ValueError: Reference position are not numbers');
        }
        // Ensure that latitude and longitude are valid.
        referenceLatitude = this.clipLatitude(referenceLatitude);
        referenceLongitude = this.normalizeLongitude(referenceLongitude);

        // Clean up the passed code.
        shortCode = shortCode.toUpperCase();
        // Compute the number of digits we need to recover.
        var paddingLength = this.SEPARATOR_POSITION_ - shortCode.indexOf(this.SEPARATOR_);
        // The resolution (height and width) of the padded area in degrees.
        var resolution = Math.pow(20, 2 - (paddingLength / 2));
        // Distance from the center to an edge (in degrees).
        var halfResolution = resolution / 2.0;

        // Use the reference location to pad the supplied short code and decode it.
        var codeArea = this.decode(
            this.encode(referenceLatitude, referenceLongitude).substr(0, paddingLength)
            + shortCode);
        // How many degrees latitude is the code from the reference? If it is more
        // than half the resolution, we need to move it north or south but keep it
        // within -90 to 90 degrees.
        if (referenceLatitude + halfResolution < codeArea.latitudeCenter &&
            codeArea.latitudeCenter - resolution >= -this.LATITUDE_MAX_) {
            // If the proposed code is more than half a cell north of the reference location,
            // it's too far, and the best match will be one cell south.
            codeArea.latitudeCenter -= resolution;
        } else if (referenceLatitude - halfResolution > codeArea.latitudeCenter &&
            codeArea.latitudeCenter + resolution <= this.LATITUDE_MAX_) {
            // If the proposed code is more than half a cell south of the reference location,
            // it's too far, and the best match will be one cell north.
            codeArea.latitudeCenter += resolution;
        }

        // How many degrees longitude is the code from the reference?
        if (referenceLongitude + halfResolution < codeArea.longitudeCenter) {
            codeArea.longitudeCenter -= resolution;
        } else if (referenceLongitude - halfResolution > codeArea.longitudeCenter) {
            codeArea.longitudeCenter += resolution;
        }

        return this.encode(
            codeArea.latitudeCenter, codeArea.longitudeCenter, codeArea.codeLength);
    }

    /**
     * Remove characters from the start of an OLC code.
     *
     * This uses a reference location to determine how many initial characters
     * can be removed from the OLC code. The number of characters that can be
     * removed depends on the distance between the code center and the reference
     * location.
     *
     * @param {string} code The full code to shorten.
     * @param {number} latitude The latitude to use for the reference location.
     * @param {number} longitude The longitude to use for the reference location.
     * @return {string} The code, shortened as much as possible that it is still
     *     the closest matching code to the reference location.
     * @throws {Exception} if the passed code is not a valid full code or the
     *     reference location values are not numbers.
     */
    public static shorten(code: string, latitude: number, longitude: number) {
        if (!this.isFull(code)) {
            throw new Error('ValueError: Passed code is not valid and full: ' + code);
        }
        if (code.indexOf(this.PADDING_CHARACTER_) != -1) {
            throw new Error('ValueError: Cannot shorten padded codes: ' + code);
        }
        code = code.toUpperCase();
        var codeArea = this.decode(code);
        if (codeArea.codeLength < this.MIN_TRIMMABLE_CODE_LEN_) {
            throw new Error(
                'ValueError: Code length must be at least ' +
                this.MIN_TRIMMABLE_CODE_LEN_);
        }
        // Ensure that latitude and longitude are valid.
        latitude = Number(latitude);
        longitude = Number(longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('ValueError: Reference position are not numbers');
        }
        latitude = this.clipLatitude(latitude);
        longitude = this.normalizeLongitude(longitude);
        // How close are the latitude and longitude to the code center.
        var range = Math.max(
            Math.abs(codeArea.latitudeCenter - latitude),
            Math.abs(codeArea.longitudeCenter - longitude));
        for (var i = this.PAIR_RESOLUTIONS_.length - 2; i >= 1; i--) {
            // Check if we're close enough to shorten. The range must be less than 1/2
            // the resolution to shorten at all, and we want to allow some safety, so
            // use 0.3 instead of 0.5 as a multiplier.
            if (range < (this.PAIR_RESOLUTIONS_[i] * 0.3)) {
                // Trim it.
                return code.substring((i + 1) * 2);
            }
        }
        return code;
    }

    /**
     * Clip a latitude into the range -90 to 90.
     *
     * @param {number} latitude
     * @return {number} The latitude value clipped to be in the range.
     */
    private static clipLatitude(latitude: number) {
        return Math.min(90, Math.max(-90, latitude));
    }

    /**
     * Normalize a longitude into the range -180 to 180, not including 180.
     *
     * @param {number} longitude
     * @return {number} Normalized into the range -180 to 180.
     */
    private static normalizeLongitude(longitude: number) {
        while (longitude < -180) {
            longitude = longitude + 360;
        }
        while (longitude >= 180) {
            longitude = longitude - 360;
        }
        return longitude;
    }

}


class CodeArea {
    /**
       * The latitude of the SW corner.
       * @type {number}
       */
      public latitudeLo: number;
      /**
       * The longitude of the SW corner in degrees.
       * @type {number}
       */
      public longitudeLo: number;
      /**
       * The latitude of the NE corner in degrees.
       * @type {number}
       */
      public latitudeHi: number;
      /**
       * The longitude of the NE corner in degrees.
       * @type {number}
       */
      public longitudeHi: number;
      /**
       * The number of digits in the code.
       * @type {number}
       */
      public codeLength: number;
      /**
       * The latitude of the center in degrees.
       * @type {number}
       */
      public latitudeCenter: number;
      /**
       * The longitude of the center in degrees.
       * @type {number}
       */
      public longitudeCenter: number;

    constructor(latitudeLo: number, longitudeLo: number, latitudeHi: number, longitudeHi: number, codeLength: number) {
        this.latitudeLo = latitudeLo;
        this.longitudeLo = longitudeLo;
        this.latitudeHi = latitudeHi;
        this.longitudeHi = longitudeHi;
        this.codeLength = codeLength;
        this.latitudeCenter = Math.min(latitudeLo + (latitudeHi - latitudeLo) / 2, OpenLocationCode.LATITUDE_MAX_);
        this.longitudeCenter = Math.min(longitudeLo + (longitudeHi - longitudeLo) / 2, OpenLocationCode.LONGITUDE_MAX_);
    }
}