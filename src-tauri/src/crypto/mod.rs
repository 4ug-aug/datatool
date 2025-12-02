use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::Rng;
use std::env;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Encryption failed")]
    EncryptionFailed,
    #[error("Decryption failed")]
    DecryptionFailed,
    #[error("Invalid data format")]
    InvalidFormat,
}

/// Derives a 32-byte key from machine-specific identifiers
fn derive_key() -> [u8; 32] {
    // Use a combination of machine-specific values and a fixed salt
    // In production, you might want to use OS keychain APIs
    let machine_id = env::var("USER")
        .or_else(|_| env::var("USERNAME"))
        .unwrap_or_else(|_| "default_user".to_string());
    
    let salt = "datatool_encryption_salt_v1";
    let combined = format!("{}{}", machine_id, salt);
    
    // Simple key derivation (in production, use a proper KDF like Argon2)
    let mut key = [0u8; 32];
    let bytes = combined.as_bytes();
    for (i, byte) in bytes.iter().cycle().take(32).enumerate() {
        key[i] = *byte;
    }
    key
}

/// Encrypts a password using AES-256-GCM
/// Returns a base64-encoded string containing nonce + ciphertext
pub fn encrypt_password(password: &str) -> Result<String, CryptoError> {
    let key = derive_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|_| CryptoError::EncryptionFailed)?;
    
    // Generate random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // Encrypt the password
    let ciphertext = cipher
        .encrypt(nonce, password.as_bytes())
        .map_err(|_| CryptoError::EncryptionFailed)?;
    
    // Combine nonce + ciphertext and encode as base64
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);
    
    use base64::{engine::general_purpose::STANDARD, Engine};
    Ok(STANDARD.encode(&combined))
}

/// Decrypts a password that was encrypted with encrypt_password
pub fn decrypt_password(encrypted: &str) -> Result<String, CryptoError> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    
    let combined = STANDARD
        .decode(encrypted)
        .map_err(|_| CryptoError::InvalidFormat)?;
    
    if combined.len() < 12 {
        return Err(CryptoError::InvalidFormat);
    }
    
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let key = derive_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|_| CryptoError::DecryptionFailed)?;
    
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)?;
    
    String::from_utf8(plaintext).map_err(|_| CryptoError::DecryptionFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let password = "my_secret_password";
        let encrypted = encrypt_password(password).unwrap();
        let decrypted = decrypt_password(&encrypted).unwrap();
        assert_eq!(password, decrypted);
    }
}

