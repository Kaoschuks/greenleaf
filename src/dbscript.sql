CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    gender VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    date_of_birth DATE NOT NULL,
    nin VARCHAR(20) NOT NULL,  -- National Identification Number
    referral_code VARCHAR(25) NULL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS  wallets (
  user_id INT PRIMARY KEY,
  balance DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS  wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type ENUM('credit', 'debit'),
  amount DECIMAL(15,2),
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS insurance_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    the_name VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    cost DECIMAL(15, 2) NOT NULL,
    frequency VARCHAR(63) NOT NULL,
    next_payment_time DATETIME NOT NULL,
    the_status VARCHAR(63) NOT NULL DEFAULT 'in_review',
    provider_reference VARCHAR(255),
    provider_payload LONGTEXT,
    activation_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(65) NOT NULL,
    last_name VARCHAR(65) NOT NULL,
    username VARCHAR(65) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(35) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN user_address VARCHAR(255),
  ADD COLUMN marital_status VARCHAR(63),
  ADD COLUMN next_of_kin VARCHAR(100),
  ADD COLUMN next_of_kin_phone VARCHAR(20),
  ADD COLUMN next_of_kin_email VARCHAR(150),
  ADD COLUMN employer VARCHAR(150),
  ADD COLUMN employer_address VARCHAR(255);

