
import mongoose from 'mongoose';
import { logger } from './Logger';

export class myDB {
    static DB: myDB = new myDB();
    DB_NAME = 'studentPortal_DB';
    URI = `mongodb://localhost:27017/${this.DB_NAME}`;

    async connectToDb(): Promise<void> {
        try {
            await mongoose.connect(this.URI);
            console.log('Connected to MongoDB (Mongoose)');
            logger.info('Connected to MongoDB successfully');
        } catch (err) {
            console.error('MongoDB connection error:', err);
            logger.error(`MongoDB connection failed: ${err}`);
            process.exit(1);
        }
    }

    static getDB(): myDB {
        return this.DB;
    }
}

