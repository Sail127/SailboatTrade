-- CreateEnum
CREATE TYPE "BoatCondition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'GAS');

-- CreateEnum
CREATE TYPE "VolumeUnit" AS ENUM ('gal', 'L');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "airDraft" DOUBLE PRECISION,
ADD COLUMN     "airDraftUnit" TEXT,
ADD COLUMN     "boatCondition" "BoatCondition",
ADD COLUMN     "cabins" INTEGER,
ADD COLUMN     "dinghyLength" DOUBLE PRECISION,
ADD COLUMN     "dinghyLengthUnit" TEXT,
ADD COLUMN     "dinghyModel" TEXT,
ADD COLUMN     "dinghyMotor" BOOLEAN,
ADD COLUMN     "engineFuel" "FuelType",
ADD COLUMN     "engineHorsepower" INTEGER,
ADD COLUMN     "engineMake" TEXT,
ADD COLUMN     "engineModel" TEXT,
ADD COLUMN     "generatorFuel" "FuelType",
ADD COLUMN     "generatorHours" INTEGER,
ADD COLUMN     "generatorKw" DOUBLE PRECISION,
ADD COLUMN     "generatorMake" TEXT,
ADD COLUMN     "hasDinghy" BOOLEAN,
ADD COLUMN     "hasGenerator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heads" INTEGER,
ADD COLUMN     "leftEngineHours" INTEGER,
ADD COLUMN     "propeller" TEXT,
ADD COLUMN     "rightEngineHours" INTEGER,
ADD COLUMN     "tankFuel" DOUBLE PRECISION,
ADD COLUMN     "tankHolding" DOUBLE PRECISION,
ADD COLUMN     "tankUnit" "VolumeUnit",
ADD COLUMN     "tankWater" DOUBLE PRECISION;
