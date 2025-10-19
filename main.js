// === Імпорт потрібних модулів ===
import fs from "fs/promises";        // Для асинхронного читання файлів
import http from "http";             // Для створення HTTP сервера
import { Command } from "commander"; // Для зчитування аргументів командного рядка
import { XMLBuilder } from "fast-xml-parser"; // Для перетворення JSON → XML

// === Налаштовуємо командний рядок ===
const program = new Command();

program
  .requiredOption("-i, --input <path>", "Path to input JSON file") // шлях до файлу
  .requiredOption("-h, --host <host>", "Host for the server")       // хост
  .requiredOption("-p, --port <port>", "Port for the server");      // порт

program.parse(process.argv);
const options = program.opts(); // отримуємо введені параметри

// === Створюємо HTTP сервер ===
const server = http.createServer(async (req, res) => {
  try {
    // --- 1. Читаємо JSON файл ---
    const data = await fs.readFile(options.input, "utf-8");
    const cars = data
      .trim()
      .split("\n")
      .map(line => JSON.parse(line)); // кожен рядок окремий JSON-об'єкт

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

    // --- 6. Відправляємо XML-відповідь ---
    res.writeHead(200, { "Content-Type": "application/xml" });
    res.end(xmlData);

  } catch (error) {
    // --- 7. Обробка помилок ---
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Cannot find input file");
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error: " + error.message);
    }
  }
});

// === 8. Запускаємо сервер ===
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});
