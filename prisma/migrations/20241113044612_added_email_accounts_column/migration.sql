/*
  Warnings:

  - Added the required column `email` to the `EmailAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN     "email" TEXT NOT NULL;
