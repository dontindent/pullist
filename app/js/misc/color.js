class RGB {
    constructor (r, g, b, a) {
        this.R = Math.floor(r) || 0;
        this.G = Math.floor(g) || 0;
        this.B = Math.floor(b) || 0;
        this.A = a || 1.0;
    }

    // noinspection JSUnusedGlobalSymbols
    get rgb () {
        return 'rgb(' + this.R + ', ' + this.G + ', ' + this.B + ')';
    }

    // noinspection JSUnusedGlobalSymbols
    get rgba () {
        return 'rgba(' + this.R + ', ' + this.G + ', ' + this.B + ', ' + this.A + ')';
    }

    get hex() {
        return '#' + ('00' + this.R.toString(16).toUpperCase()).slice(-2) +
                    ('00' + this.G.toString(16).toUpperCase()).slice(-2) +
                    ('00' + this.B.toString(16).toUpperCase()).slice(-2);
    }

    // noinspection JSUnusedGlobalSymbols
    get hexAlpha() {
        return this.hex + ('00' + this.A.toString(16).toUpperCase().slice(-2));
    }

    // noinspection JSUnusedGlobalSymbols
    shade (shadeVal) {
        return new RGB (this.R * shadeVal,
                        this.G * shadeVal,
                        this.B * shadeVal,
                        this.A);
    }

    tint (tintVal) {
        return new RGB (this.R + ((255 - this.A) * tintVal),
                        this.G + ((255 - this.G) * tintVal),
                        this.B + ((255 - this.B) * tintVal),
                        this.A);
    }

    average (color) {
        return new RGB ((this.R + color.R) / 2,
                        (this.G + color.G) / 2,
                        (this.B + color.B) / 2,
                        (this.A + color.A) / 2);
    }

    static fromHex(hex) {
        let m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{0,2})$/i);
        return new RGB(parseInt(m[1], 16),
                        parseInt(m[2], 16),
                        parseInt(m[3], 16),
                        parseInt(m[4] || 'FF', 16));
    }
}


class Color {
    constructor (r, g, b, a) {
        if (!g) this.base = RGB.fromHex(r);
        else this.base = new RGB(r, g, b, a);

        // this.shade1 = this.base.shade(0.5);
        // this.shade2 = this.base.shade(1 / 3);
        // this.shade3 = this.base.shade(0.5 / 3);
        // this.tint1 = this.base.tint(0.5 / 3);
        // this.tint2 = this.base.tint(1 / 3);
        // this.tint3 = this.base.tint(0.5);

        this.shade3 = this.base.average(new RGB(0, 0, 0, 1));
        this.shade2 = this.base.average(this.shade3);
        this.shade1 = this.base.average(this.shade2);

        this.tint3 = this.base.average(new RGB(255, 255, 255, 1));
        this.tint2 = this.base.average(this.tint3);
        this.tint1 = this.base.average(this.tint2);
    }
}

exports.RGB = module.exports.RGB = RGB;
exports.Color = module.exports.Color = Color;