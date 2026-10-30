-- Existing users and new registrations default to USER; promote admins explicitly.
ALTER TABLE `users` ADD COLUMN `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';
