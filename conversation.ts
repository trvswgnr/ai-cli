import { Database } from "bun:sqlite";
import { nanoid } from "nanoid";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";

// Define message types
type Role = "system" | "user" | "assistant";

interface Message {
    id?: string;
    conversationId: string;
    role: Role;
    content: string;
    createdAt?: string;
}

interface SaveMessageOptions {
    conversationId?: string;
    role: Role;
    content: string;
    createNewConversation?: boolean;
}

// Get path to the database
function getDatabasePath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
        throw new Error("Could not determine home directory");
    }
    
    const dataDir = join(homeDir, ".ai-cli");
    
    // Create directory if it doesn't exist
    if (!existsSync(dataDir)) {
        mkdir(dataDir, { recursive: true });
    }
    
    return join(dataDir, "conversations.db");
}

// Initialize database
function getDb(): Database {
    const db = new Database(getDatabasePath());
    
    // Create tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversationId TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (conversationId) REFERENCES conversations(id)
        );
        
        CREATE TABLE IF NOT EXISTS current_conversation (
            id INTEGER PRIMARY KEY,
            conversationId TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            FOREIGN KEY (conversationId) REFERENCES conversations(id)
        );
    `);
    
    return db;
}

// Create a new conversation
function createConversation(db: Database): string {
    const conversationId = nanoid();
    const now = new Date().toISOString();
    
    db.run(
        "INSERT INTO conversations (id, createdAt, updatedAt) VALUES (?, ?, ?)",
        [conversationId, now, now]
    );
    
    return conversationId;
}

// Set the current conversation
function setCurrentConversation(db: Database, conversationId: string): void {
    const now = new Date().toISOString();
    
    // Delete any existing current conversation
    db.run("DELETE FROM current_conversation");
    
    // Insert the new current conversation
    db.run(
        "INSERT INTO current_conversation (id, conversationId, updatedAt) VALUES (?, ?, ?)",
        [1, conversationId, now]
    );
}

// Get the current conversation ID
export async function getCurrentConversationId(): Promise<string | undefined> {
    const db = getDb();
    
    const result = db.query(
        "SELECT conversationId FROM current_conversation ORDER BY updatedAt DESC LIMIT 1"
    ).get();
    
    return result ? (result as { conversationId: string }).conversationId : undefined;
}

// Save a message
export async function saveMessage(options: SaveMessageOptions): Promise<string> {
    const db = getDb();
    let { conversationId, role, content, createNewConversation } = options;
    
    // Create a new conversation if requested or if no conversation ID provided
    if (createNewConversation || !conversationId) {
        conversationId = createConversation(db);
    }
    
    // Update conversation timestamp
    const now = new Date().toISOString();
    db.run(
        "UPDATE conversations SET updatedAt = ? WHERE id = ?",
        [now, conversationId]
    );
    
    // Set as current conversation
    setCurrentConversation(db, conversationId);
    
    // Save message
    const messageId = nanoid();
    db.run(
        "INSERT INTO messages (id, conversationId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)",
        [messageId, conversationId, role, content, now]
    );
    
    return conversationId;
}

// Get all messages for a conversation
export async function getConversation(conversationId: string): Promise<Message[]> {
    const db = getDb();
    
    const results = db.query(
        "SELECT id, conversationId, role, content, createdAt FROM messages WHERE conversationId = ? ORDER BY createdAt ASC"
    ).all(conversationId) as Message[];
    
    return results;
}

// List all conversations
export async function listConversations(): Promise<{ id: string, updatedAt: string }[]> {
    const db = getDb();
    
    const results = db.query(
        "SELECT id, updatedAt FROM conversations ORDER BY updatedAt DESC"
    ).all() as { id: string, updatedAt: string }[];
    
    return results;
}