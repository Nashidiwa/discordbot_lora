/*
  Warnings:

  - The primary key for the `word_chain_word_cache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `languages` on the `word_chain_word_cache` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_word_chain_word_cache" (
    "word" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "is_negative" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("language", "word")
);
INSERT INTO "new_word_chain_word_cache" ("created_at", "expires_at", "is_negative", "word") SELECT "created_at", "expires_at", "is_negative", "word" FROM "word_chain_word_cache";
DROP TABLE "word_chain_word_cache";
ALTER TABLE "new_word_chain_word_cache" RENAME TO "word_chain_word_cache";
CREATE INDEX "word_chain_word_cache_expires_at_idx" ON "word_chain_word_cache"("expires_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
