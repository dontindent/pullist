CREATE TABLE "Comic"(
        "Id" integer primary key autoincrement not null ,
        "Series" varchar ,
        "Number" float ,
        "Writer" varchar ,
        "Artist" varchar ,
        "CoverArtist" varchar ,
        "Publisher" varchar ,
        "Description" varchar ,
        "Price" float ,
        "Pulled" integer ,
        "Watched" integer ,
        "Code" varchar ,
        "CoverURL" varchar ,
        "Reprint" integer ,
        "Variant" integer ,
        "ReleaseDate" bigint ,
        "OriginalString" varchar ,
        "MainId" integer ,
        "CoverSource" varchar
);

CREATE INDEX "Comic_MainId" on "Comic"("MainId");