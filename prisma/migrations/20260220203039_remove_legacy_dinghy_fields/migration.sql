/*
  Warnings:

  - You are about to drop the column `dinghyLength` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `dinghyLengthUnit` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `dinghyModel` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `dinghyMotor` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "dinghyLength",
DROP COLUMN "dinghyLengthUnit",
DROP COLUMN "dinghyModel",
DROP COLUMN "dinghyMotor";
