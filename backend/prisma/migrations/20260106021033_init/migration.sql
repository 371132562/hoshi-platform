-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "roleId" TEXT,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowedRoutes" JSONB NOT NULL DEFAULT [],
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT [],
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ArticleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" TEXT NOT NULL,
    "articles" JSONB NOT NULL DEFAULT [],
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- CreateIndex
CREATE INDEX "User_id_idx" ON "User"("id");

-- CreateIndex
CREATE INDEX "User_code_delete_idx" ON "User"("code", "delete");

-- CreateIndex
CREATE INDEX "User_email_delete_idx" ON "User"("email", "delete");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_code_delete_key" ON "User"("code", "delete");

-- CreateIndex
CREATE INDEX "Role_id_idx" ON "Role"("id");

-- CreateIndex
CREATE INDEX "Role_name_delete_idx" ON "Role"("name", "delete");

-- CreateIndex
CREATE INDEX "Article_id_delete_idx" ON "Article"("id", "delete");

-- CreateIndex
CREATE INDEX "ArticleOrder_page_delete_idx" ON "ArticleOrder"("page", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "Image_filename_key" ON "Image"("filename");

-- CreateIndex
CREATE INDEX "Image_id_delete_idx" ON "Image"("id", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "Image_hash_delete_key" ON "Image"("hash", "delete");
