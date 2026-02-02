
import app from './app';
import { myDB } from './Utils/ConnectDB';

const PORT = 3000;

(async () => {
    try {
        await myDB.getDB().connectToDb();
        console.log('MongoDB connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to connect to DB', err);
        process.exit(1);
    }
})();
