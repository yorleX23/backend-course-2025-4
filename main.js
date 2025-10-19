// === 1. Імпортуємо модулі ===
import fs from "fs/promises";
import http from "http";
import { Command } from "commander";
import { XMLBuilder } from "fast-xml-parser";

// === 2. Налаштування командного рядка ===
const program = new Command();

program
  .requiredOption("-i, --input <path>", "Path to input JSON file")
  .requiredOption("-h, --host <host>", "Host for the server")
  .requiredOption("-p, --port <port>", "Port for the server");

program.parse(process.argv);
const options = program.opts();

// === 3. Створюємо сервер ===
const server = http.createServer(async (req, res) => {
  try {
    // --- 1. Читаємо JSON файл ---
    const data = await fs.readFile(options.input, "utf-8");
    const cars = data
      .trim()
      .split("\n")
      .map(line => JSON.parse(line));

    // --- 2. Зчитуємо параметри з URL ---
    const url = new URL(req.url, `http://${options.host}:${options.port}`);
    const showCylinders = url.searchParams.get("cylinders") === "true";
    const maxMpg = parseFloat(url.searchParams.get("max_mpg"));

    // --- 3. Фільтруємо дані ---
    let filtered = cars;
    if (!isNaN(maxMpg)) {
      filtered = filtered.filter(car => car.mpg < maxMpg);
    }

    // --- 4. Формуємо результат ---
    const result = filtered.map(car => {
      const obj = { model: car.model, mpg: car.mpg };
      if (showCylinders) obj.cyl = car.cyl;
      return obj;
    });

    // --- 5. Створюємо XML ---
    const builder = new XMLBuilder({ format: true });
    const xmlData = builder.build({ cars: { car: result } });

    // --- 6. Відправляємо XML-відповідь клієнту ---
    res.writeHead(200, { "Content-Type": "application/xml" });
    res.end(xmlData);

    // --- 7. Записуємо XML у файл (writeFile) ---
    await fs.writeFile("last_response.xml", xmlData, "utf-8");
    console.log("last_response.xml was updated.");

  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Cannot find input file");
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error: " + error.message);
    }
  }
});

// === 4. Запускаємо сервер ===
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});
