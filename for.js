const db = require("./db");
async function packet(sql) {
  const res = await new Promise((resolve, reject) => {
    return db.query(sql, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
  return res;
}

exports.packet = packet;
