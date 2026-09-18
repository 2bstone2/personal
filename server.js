require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Earshot running at http://localhost:${PORT}`));
