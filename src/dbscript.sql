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
    nin_verified BOOLEAN DEFAULT FALSE,
    referral_code VARCHAR(25) NULL,
    referred_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS  wallets (
  user_id INT PRIMARY KEY,
  balance DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(100),
  user_id INT,
  policy_id INT,
  type ENUM('credit', 'debit'),
  amount DECIMAL(15,2),
  reference VARCHAR(100),
  status ENUM('completed', 'pending', 'failed') DEFAULT 'completed',
  balance_before DECIMAL(15,2) DEFAULT 0,
  balance_after DECIMAL(15,2) DEFAULT 0,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id)
);

CREATE TABLE IF NOT EXISTS insurance_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_number VARCHAR(50),
    user_id INT NOT NULL,
    the_name VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    cost DECIMAL(15, 2) NOT NULL,
    premium DECIMAL(15, 2),
    sum_insured DECIMAL(15, 2),
    frequency VARCHAR(63) NOT NULL,
    next_payment_time DATETIME NOT NULL,
    the_status VARCHAR(63) NOT NULL DEFAULT 'in_review',
    policy_type VARCHAR(50),
    coverage_type VARCHAR(50),
    provider_reference VARCHAR(255),
    provider_payload LONGTEXT,
    activation_date DATE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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
  ADD COLUMN employer_address VARCHAR(255),
  ADD COLUMN profile_image VARCHAR(500);


-- Add missing columns if they don't exist
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status ENUM('completed', 'pending', 'failed') DEFAULT 'completed';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_before DECIMAL(15,2) DEFAULT 0;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after DECIMAL(15,2) DEFAULT 0;

-- Providers table (Insurance providers like Sovereign Trust)
CREATE TABLE IF NOT EXISTS providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    api_base_url VARCHAR(500),
    agent_email VARCHAR(255),
    agent_password VARCHAR(255),
    wallet_uid VARCHAR(255),
    wallet_balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    image VARCHAR(500),
    description TEXT,
    website VARCHAR(500),
    webhook_url VARCHAR(500),
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- API Activity Log table for tracking all API activities
CREATE TABLE IF NOT EXISTS api_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    admin_user_id INT,
    action VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    request_body TEXT,
    response_status INT,
    response_body TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
);

-- User Notifications table for activities
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Settings table for notification preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    policy_reminders BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin Settings table for global app settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_name VARCHAR(100) DEFAULT 'GreenLeaf',
    company_name VARCHAR(255),
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    company_address TEXT,
    company_website VARCHAR(255),
    support_email VARCHAR(255),
    minimum_withdrawal DECIMAL(15,2) DEFAULT 1000,
    maximum_withdrawal DECIMAL(15,2) DEFAULT 1000000,
    kyc_required BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    allow_registration BOOLEAN DEFAULT TRUE,
    referral_bonus DECIMAL(15,2) DEFAULT 500,
    referral_bonus_type VARCHAR(20) DEFAULT 'fixed',
    transaction_fee DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    currency_symbol VARCHAR(5) DEFAULT '₦',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

