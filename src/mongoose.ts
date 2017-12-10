import * as mongoose from 'mongoose';
mongoose.connect('mongodb://mongodb/mydb', { useMongoClient: true });
(<any>mongoose).Promise = global.Promise;
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("DB is now connected");
});
