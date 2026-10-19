/*
  Warnings:

  - You are about to drop the `role_update_queues` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "role_update_queues";
PRAGMA foreign_keys=on;
