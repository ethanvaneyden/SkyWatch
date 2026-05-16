<?php
//Ethan Van Eyden
//u25260244
require_once "config.php";
header('Content-Type: application/json');

class LuminaAPI
{
    private $db;
    private $requestData;
    private $currentUserId;

    public function __construct($dbconnection)
    {
        $this->db = $dbconnection;
        $this->requestData = json_decode(file_get_contents('php://input'), true);
    }
    /**
     * Routes incoming API requests based on the "type" field.
     *
     * Creates and delegates work to the appropriate service class.
     * Performs API key validation for protected endpoints before execution.
     */
    public function processRequest()
    {
        if (!isset($this->requestData["type"])) {
            $this->sendResponse("error", "Missing request type.", 400);
            return;
        }

        switch ($this->requestData["type"]) {
            case "Register":
                $register = new UserService($this->db, $this->requestData);
                $response = $register->handleRegistration();
                $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                break;
            case "Login":
                $login = new UserService($this->db, $this->requestData);
                $response = $login->handleLogin();
                $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                break;
            case "GetAllPlanes":
                if ($this->checkAPIKey($this->requestData)) {
                    $planes = new PlanesService($this->db, $this->requestData);
                    $response = $planes->handlePlanes();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "GetAllAirports":
                if ($this->checkAPIKey($this->requestData)) {
                    $airports = new AirportsService($this->db, $this->requestData);
                    $response = $airports->handleAirports();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "Favourite":
                if ($this->checkAPIKey($this->requestData)) {
                    $favourites = new FavouritesService($this->db, $this->requestData, $this->currentUserId);
                    $response = $favourites->handle();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "GetBookings":
                if ($this->checkAPIKey($this->requestData)) {
                    $bookings = new BookingService($this->db, $this->requestData, $this->currentUserId);
                    $response = $bookings->getBookings();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "BookFlight":
                if ($this->checkAPIKey($this->requestData)) {
                    $bookflight = new BookingService($this->db, $this->requestData, $this->currentUserId);
                    $response = $bookflight->book();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "RemoveBooking":
                if ($this->checkAPIKey($this->requestData)) {
                    $remove = new BookingService($this->db, $this->requestData, $this->currentUserId);
                    $response = $remove->removeBooking();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "GetAllFlights":
                if ($this->checkAPIKey($this->requestData)) {
                    $flights = new FlightsService($this->db, $this->requestData, $this->currentUserId);
                    $response = $flights->getAllFlights();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "GetFlight":
                if ($this->checkAPIKey($this->requestData)) {
                    $flights = new FlightsService($this->db, $this->requestData, $this->currentUserId);
                    $response = $flights->getFlight();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "GetAirports":
                if ($this->checkAPIKey($this->requestData)) {
                    $airports = new AirportsService($this->db, $this->requestData);
                    $response = $airports->getAllAirports();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "DispatchFlight":
                if ($this->checkAPIKey($this->requestData)) {
                    $dispatcher = new FlightsService($this->db, $this->requestData, $this->currentUserId);
                    $response = $dispatcher->dispatchFlight();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "UpdateFlightPosition":
                if ($this->checkSecretKey()) {
                    $flight = new FlightsService($this->db, $this->requestData);
                    $response = $flight->updateFlightPosition();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            case "BoardFlight":
                if ($this->checkAPIKey($this->requestData)) {
                    $dispatcher = new FlightsService($this->db, $this->requestData, $this->currentUserId);
                    $response = $dispatcher->boardFlight();
                    $this->sendResponse($response['status'], $response['data'], $response['responseCode']);
                }
                break;
            default:
                $this->sendResponse("error", "Unknown request type.", 400);
                break;
        }
    }

    private function sendResponse($status, $data, $responseCode = 200)
    {
        http_response_code($responseCode);
        $response = [
            "status" => $status,
            "timestamp" => time() * 1000,
            "data" => $data,
        ];
        echo json_encode($response);
        exit();
    }

    private function checkAPIKey($data)
    {
        if (empty($data["apikey"])) {
            $this->sendResponse("error", "Missing API key.", 400);
        }

        try {
            $stmt = $this->db->prepare(
                "SELECT id FROM users WHERE api_key = ?"
            );

            $stmt->execute([$data["apikey"]]);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->sendResponse("error", "The API key is invalid.", 401);
            }
            $this->currentUserId = $result['id'];
            return true;
        } catch (PDOException $e) {
            $this->sendResponse("error", $e->getCode());
        }
    }

    private function checkSecretKey()
    {

        if (empty($this->requestData["internal_key"])) {
            $this->sendResponse("error", "Missing internal key.", 400);
        }

        if (INTERNAL_API_KEY !== $this->requestData['secret_key']) {
            $this->sendResponse("error", "The API key is invalid.", 401);
        }

        return true;
    }
}

class UserService
{
    private $db;
    private $requestData;

    public function __construct($db, $requestData)
    {
        $this->db = $db;
        $this->requestData = $requestData;
    }

    public function handleRegistration()
    {
        $data = $this->requestData;

        if (empty($data['name']) || empty($data['email']) || empty($data['password']) || empty($data['surname']) || empty($data['user_type'])) {
            return [
                'status' => 'error',
                'data' => 'Missing required data.',
                'responseCode' => 400
            ];
        }
        if (!preg_match("/^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_'+\-]@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/", $data['email'])) {
            return [
                'status' => 'error',
                'data' => 'Invalid email.',
                'responseCode' => 400
            ];
        }
        if (!preg_match("/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/", $data['password'])) {
            return [
                'status' => 'error',
                'data' => 'Invalid password.',
                'responseCode' => 400
            ];
        }
        $allowedTypes = ['Passenger', 'ATC'];
        if (!in_array($data['user_type'], $allowedTypes)) {
            return [
                'status' => 'error',
                'data' => 'Invalid user type.',
                'responseCode' => 400
            ];
        }

        $hashedPassword = password_hash($data['password'], PASSWORD_ARGON2I);
        $apikey = $this->generateAPIKey();

        try {
            $stmt = $this->db->prepare("INSERT INTO users (name, surname, email, password, type, api_key)
        VALUES (?, ?, ?, ?, ?, ?)");

            $success = $stmt->execute([
                $data['name'],
                $data['surname'],
                $data['email'],
                $hashedPassword,
                $data['user_type'],
                $apikey
            ]);
            return [
                'status' => 'success',
                'data' => [
                    'apikey' => $apikey
                ],
                'responseCode' => 200

            ];
        } catch (PDOException $e) {

            if ($e->getCode() == 23000) {
                return [
                    "status" => "error",
                    "data" => "Email already exists.",
                    'responseCode' => 409
                ];
            }

            return [
                "status" => "error",
                "data" => "Database error.",
                "responseCode" => 500
            ];
        }
    }

    public function handleLogin()
    {
        $data = $this->requestData;
        if (empty($data['email']) || empty($data["password"])) {
            return [
                'status' => 'error',
                'data' => 'Email and password required.',
                'responseCode' => 400
            ];
        }

        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user || !password_verify($data['password'], $user['password'])) {
            return [
                'status' => 'error',
                'data' => 'Invalid credentials.',
                'responseCode' => 401
            ];
        }
        return [
            'status' => 'success',
            'data' => [
                'apikey' => $user['api_key'],
                'name' => $user['name'],
                'surname' => $user['surname'],
                'email' => $user['email'],
                'type' => $user['type']
            ],
            'responseCode' => 200
        ];
    }

    private function generateAPIKey()
    {
        return bin2hex(random_bytes(16));
    }
}

class PlanesService
{
    private $db;
    private $requestData;

    public function __construct($db, $requestData)
    {
        $this->db = $db;
        $this->requestData = $requestData;
    }

    public function handlePlanes()
    {
        if (!is_dir("cache")) {
            mkdir("cache", 0755, true);
        }
        $cacheKey = md5(json_encode($this->requestData));
        $cacheFile = "cache/cache_planes_" . $cacheKey . ".json";
        $cacheTime = 60;

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
            return [
                'status' => 'success',
                'data' => json_decode(file_get_contents($cacheFile), true),
                'responseCode' => 200
            ];
        }
        $data = $this->requestData;
        $sql = $this->buildQuery($data);
        return $this->execute($sql);
    }

    private function execute($sql)
    {
        try {
            $stmt = $this->db->prepare($sql['sql']);
            $stmt->execute($sql['params']);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $cacheKey = md5(json_encode($this->requestData));
            $cacheFile = "cache/cache_planes_" . $cacheKey . ".json";

            file_put_contents($cacheFile, json_encode($result));

            return [
                'status' => 'success',
                'data' => $result,
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => $e->getMessage(),
                'responseCode' => 400
            ];
        }
    }

    // Returns an associative aray with the SQL query ["sql"] and the paramaters ["params"]
    private function buildQuery($data)
    {

        $return = $data["return"] ?? null;
        $limit = $data["limit"] ?? null;
        $sort = $data["sort"] ?? null;
        $order = $data["order"] ?? null;
        $search = $data["search"] ?? null;
        $fuzzy = $data["fuzzy"] ?? true;
        $params = [];


        $allowedColumns = [
            'id',
            'seats',
            'description',
            'image_url',
            'model',
            'manufacturer',
            'classes',
        ];

        //Injection safe compared to whitelist
        $columns = "*";
        if (isset($return) && is_array($return)) {
            $filtered = array_intersect($return, $allowedColumns);
            if (!empty($filtered)) {
                $columns = implode(",", $filtered);
            }
        }

        $specialFields = ['min_seats', 'max_seats', 'cabin_class', 'max_range_km', 'max_cargo_kg', 'max_speed_kmh'];
        $where = "";
        $conditions = [];
        if (isset($search) && is_array($search)) {
            foreach ($search as $field => $value) {
                if (!in_array($field, $allowedColumns) || in_array($field, $specialFields)) {
                    continue;
                }
                if ($fuzzy === false) {
                    $conditions[] = "$field = :$field";
                    $params[$field] = $value;
                } else {
                    $conditions[] = "$field LIKE :$field";
                    $params[$field] = "%" . $value . "%";
                }
            }
            if (isset($search['min_seats']) && trim($search['min_seats']) !== '') {
                $conditions[] = "seats >= :min_seats";
                $params['min_seats'] = (int)$search['min_seats'];
            }
            if (isset($search['max_seats']) && trim($search['max_seats']) !== '') {
                $conditions[] = "seats <= :max_seats";
                $params['max_seats'] = (int)$search['max_seats'];
            }

            if (isset($search['cabin_class']) && trim($search['cabin_class']) !== '') {
                $conditions[] = "classes LIKE :cabin_class";
                $params['cabin_class'] = "%" . $search['cabin_class'] . "%";
            }

            if (isset($search['max_range_km']) && trim($search['max_range_km']) !== '') {
                $conditions[] = "max_range_km <= :max_range_km_val";
                $params['max_range_km_val'] = (int)$search['max_range_km'];
            }

            if (isset($search['max_cargo_kg']) && trim($search['max_cargo_kg']) !== '') {
                $conditions[] = "max_cargo_kg <= :max_cargo_kg_val";
                $params['max_cargo_kg_val'] = (int)$search['max_cargo_kg'];
            }

            if (isset($search['max_speed_kmh']) && trim($search['max_speed_kmh']) !== '') {
                $conditions[] = "max_speed_kmh <= :max_speed_kmh_val";
                $params['max_speed_kmh_val'] = (int)$search['max_speed_kmh'];
            }

            if (!empty($conditions) && trim($where) === '') {
                $where = "WHERE " . implode(" AND ", $conditions);
            }
        }

        //Injection safe, compared to whitelist and validated
        $orderByClause = "";
        if (isset($sort) && is_string($sort) && in_array($sort, $allowedColumns)) {
            $direction = (isset($order) && strtoupper($order) === 'DESC') ? 'DESC' : 'ASC';
            $orderByClause = "ORDER BY $sort $direction";
        }

        $limitClause = "";
        if (isset($limit)) {
            if ((int)$limit <= 0 || !is_numeric($limit)) {
                return [
                    'status' => 'error',
                    'data' => 'Invalid limit',
                    'responseCode' => 400
                ];
            }
            $total = $this->db->query("SELECT COUNT(*) FROM planes")->fetchColumn();
            if ((int)$limit > $total) {
                return [
                    'status' => 'error',
                    'data' => 'Limit exceeds total number of records.',
                    'responseCode' => 400
                ];
            }
            $limitClause = "LIMIT " . (int)$limit;
        }

        $sql = "SELECT " . $columns . " FROM planes " .
            $where . " " . $orderByClause . " " . $limitClause;
        return [
            "sql" => $sql,
            "params" => $params
        ];
    }
}

class AirportsService
{
    private $db;
    private $requestData;
    private const RECORDS_PER_PAGE = 50;


    public function __construct($db, $requestData)
    {
        $this->db = $db;
        $this->requestData = $requestData;
    }

    public function handleAirports()
    {
        if (!is_dir("cache")) {
            mkdir("cache", 0755, true);
        }
        $cacheKey = md5(json_encode($this->requestData));
        $cacheFile = "cache/cache_airports_" . $cacheKey . ".json";
        $cacheTime = 60;

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
            return [
                'status' => 'success',
                'data' => json_decode(file_get_contents($cacheFile), true),
                'responseCode' => 200
            ];
        }

        $sql = $this->buildQuery();
        return $this->executeQuery($sql);
    }

    public function getAllAirports()
    {
        try {
            $stmt = $this->db->query("SELECT *
        FROM airports");
            $airports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                'status' => 'success',
                'data' => $airports,
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return [
                'status' => 'error',
                'data' => 'Failed to retrieve airports.',
                'responseCode' => 500
            ];
        }
    }

    private function buildQuery()
    {
        $page = $this->requestData['page'] ?? null;
        $search = $this->requestData['search'] ?? null;
        $params = [];

        //safe from injection since offset is type cast
        $limitClause = "LIMIT " . self::RECORDS_PER_PAGE;
        if (isset($page) && $page > 0) {
            $offset = (int)($page - 1) * self::RECORDS_PER_PAGE;
            $limitClause .= " OFFSET $offset";
        }

        $whereClause = "";
        if (isset($search)) {
            if (is_numeric($search)) {
                $whereClause = "WHERE ID = :search_id";
                $params[':search_id'] = (int)$search;
            } else {

                $whereClause = "WHERE (name LIKE :search_name
                OR city LIKE :search_city 
                OR country LIKE :search_country
                OR code LIKE :search_code)";
                $searchterm = "%$search%";
                $params['search_name'] = $searchterm;
                $params['search_city'] = $searchterm;
                $params['search_country'] = $searchterm;
                $params['search_code'] = $searchterm;
            }
        }

        $sql = "SELECT * FROM airports $whereClause $limitClause";

        return [
            'sql' => $sql,
            'params' => $params
        ];
    }

    private function executeQuery($sql)
    {
        try {
            $stmt = $this->db->prepare($sql['sql']);
            $stmt->execute($sql['params']);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $cacheKey = md5(json_encode($this->requestData));
            $cacheFile = "cache/cache_airports_" . $cacheKey . ".json";

            file_put_contents($cacheFile, json_encode($result));

            return [
                'status' => 'success',
                'data' => $result,
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => $e->getCode(),
                'responseCode' => 400
            ];
        }
    }
}

class FavouritesService
{
    private $db;
    private $requestData;
    private $currentUserId;

    public function __construct($db, $requestData, $currentUserId)
    {
        $this->db = $db;
        $this->requestData = $requestData;
        $this->currentUserId = $currentUserId;
    }

    public function handle()
    {
        $action = $this->requestData['action'] ?? null;
        if (!$action) {
            return ['status' => 'error', 'data' => 'Missing action', 'responseCode' => 400];
        }

        switch ($action) {
            case 'add':
                return $this->handleAdd();
            case 'remove':
                return $this->handleRemove();
            case 'fetch':
                return $this->fetchFavourites();
            default:
                return [
                    'status' => "error",
                    'data' => "Invalid favourite action",
                    'responseCode' => 400
                ];
        }
    }

    private function handleAdd()
    {
        $planeId = $this->requestData['plane_id'] ?? null;
        if (!$planeId) {
            return [
                'status' => "error",
                'data' => "Missing plane id.",
                'responseCode' => 400
            ];
        }
        try {
            $stmt = $this->db->prepare(
                "INSERT IGNORE INTO favourites (user_id, plane_id) VALUES (?, ?)"
            );
            $stmt->execute([$this->currentUserId, $planeId]);
            return [
                'status' => 'success',
                'data' => 'Plane added to favourites',
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => 'Plane not added to favourites',
                'responseCode' => 500
            ];
        }
    }

    private function handleRemove()
    {
        $planeId = $this->requestData["plane_id"] ?? null;
        if (!$planeId) {
            return [
                'status' => "error",
                'data' => "Missing plane id.",
                'responseCode' => 400
            ];
        }
        try {
            $stmt = $this->db->prepare("DELETE FROM favourites where plane_id = ? and user_id = ?");
            $stmt->execute([$planeId, $this->currentUserId]);
            return [
                'status' => 'success',
                'data' => 'Plane deleted from favourites',
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => 'Plane not deleted from favourites',
                'responseCode' => 500
            ];
        }
    }

    private function fetchFavourites()
    {
        try {
            $stmt = $this->db->prepare("
            SELECT p.* FROM planes p
            JOIN favourites f ON p.id = f.plane_id
            WHERE f.user_id = ?");

            $stmt->execute([$this->currentUserId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                'status' => "success",
                'data' => $results,
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => 'Could not fetch favourites',
                'responseCode' => 500
            ];
        }
    }
}

class BookingService
{
    private $db;
    private $requestData;
    private $userid;

    public function __construct($db, $requestData, $userid)
    {
        $this->db = $db;
        $this->requestData = $requestData;
        $this->userid = $userid;
    }

    public function getBookings()
    {
        try {
            $stmt = $this->db->prepare("SELECT b.id AS booking_id, b.passengers,
            f.id AS flight_id, f.departure_airport_code, f.arrival_airport_code,
            f.departure_date, f.flight_time, f.distance,
            p.model, p.manufacturer, p.image_url, p.seats
            FROM bookings b
            JOIN flights f on b.flight_id = f.id
            JOIN planes p ON f.plane_id = p.id
            WHERE b.user_id = ?
            ");

            $stmt->execute([$this->userid]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                'status' => 'success',
                'data' => $results,
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => 'Unable to retrieve bookings',
                'responseCode' => 500
            ];
        }
    }

    public function removeBooking()
    {
        $bookingId = $this->requestData['booking_id'] ?? null;
        if (!$bookingId) {
            return [
                'status' => 'error',
                'data' => 'Missing booking_id',
                'responseCode' => 400
            ];
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM bookings WHERE id = ? AND user_id = ?");
            $stmt->execute([$bookingId, $this->userid]);
            return [
                'status' => 'success',
                'data' => 'Booking removed',
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => 'Could not remove booking',
                'responseCode' => 500
            ];
        }
    }

    public function book()
    {
        $planeId = $this->requestData['plane_id'] ?? null;
        $depCode = $this->requestData['departure_airport_code'] ?? null;
        $arrCode = $this->requestData['arrival_airport_code'] ?? null;
        $depDate = $this->requestData['departure_date'] ?? null;
        $returnDate = $this->requestData['return_date'] ?? null;
        $passengers = (int)($this->requestData['passengers'] ?? 1);

        if (!$planeId || !$depCode || !$arrCode || !$depDate) {
            return [
                'status' => 'error',
                'data' => 'Missing required fields',
                'responseCode' => 400
            ];
        }

        $stmt = $this->db->prepare("SELECT * FROM planes WHERE id = ?");
        $stmt->execute([$planeId]);
        $plane = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$plane) {
            return [
                'status' => 'error',
                'data' => 'Invalid plane',
                'responseCode' => 400
            ];
        }

        try {
            $outboundId = $this->findOrCreateFlight($planeId, $depCode, $arrCode, $depDate, $plane);
            if ($outboundId === false) {
                return [
                    'status' => 'error',
                    'data' => 'Database error',
                    'responseCode' => 500
                ];
            }
            if ($this->isFlightFull($outboundId, $plane['seats'], $passengers)) {
                return [
                    'status' => 'error',
                    'data' => 'Outbound flight is full',
                    'responseCode' => 409
                ];
            }
            $this->insertBooking($outboundId, $passengers);

            if ($returnDate) {
                $returnId = $this->findOrCreateFlight($planeId, $arrCode, $depCode, $returnDate, $plane);
                if ($returnId === false) {
                    return [
                        'status' => 'error',
                        'data' => 'Database error',
                        'responseCode' => 500
                    ];
                }
                if ($this->isFlightFull($returnId, $plane['seats'], $passengers)) {
                    return [
                        'status' => 'error',
                        'data' => 'Return flight is full',
                        'responseCode' => 409
                    ];
                }
                $this->insertBooking($returnId, $passengers);
            }
            return [
                'status' => 'success',
                'data' => 'Booking inserted successfully',
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'data' => 'Booking failed',
                'responseCode' => 500
            ];
        }
    }

    private function checkFlight($planeId, $depCode, $arrCode, $date)
    {
        try {
            $stmt = $this->db->prepare("SELECT id
                                            FROM flights
                                            WHERE departure_airport_code = ?
                                            AND plane_id = ?
                                            AND arrival_airport_code = ?
                                            AND departure_date = ?");

            $stmt->execute([$depCode, $planeId, $arrCode, $date]);
            $results = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($results) {
                return $results['id'];
            } else {
                return null;
            }
        } catch (PDOException $e) {
            return null;
        }
    }

    private function findOrCreateFlight($planeId, $depCode, $arrCode, $date, $plane)
    {
        $existingId = $this->checkFlight($planeId, $depCode, $arrCode, $date);
        if ($existingId) {
            return $existingId;
        }

        $departureAirport = $this->getAirport($depCode);
        $arrivalAirport = $this->getAirport($arrCode);
        $distance = $this->calculateDistance($departureAirport['latitude'], $departureAirport['longitude'], $arrivalAirport['latitude'], $arrivalAirport['longitude']);
        $flightTime = $this->calculateFlightTime($distance, $plane);

        $stmt = $this->db->prepare(
            "INSERT INTO flights (plane_id, departure_airport_code, arrival_airport_code,
                              departure_date, flight_time, distance)
         VALUES (?, ?, ?, ?, ?, ?)"
        );

        $stmt->execute([$planeId, $depCode, $arrCode, $date, $flightTime, $distance]);
        return (int)$this->db->lastInsertId();
    }

    private function getAirport($airportCode)
    {
        $stmt = $this->db->prepare("SELECT *
            FROM airports
            WHERE code = ?");
        $stmt->execute([$airportCode]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function isFlightFull($flightId, $planeSeats, $newPassengers)
    {
        $stmt = $this->db->prepare("SELECT COALESCE(SUM(passengers),0) AS total FROM bookings WHERE flight_id = ?");
        $stmt->execute([$flightId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return ($row['total'] + $newPassengers > $planeSeats);
    }

    private function insertBooking($flightId, $passengers)
    {
        $stmt = $this->db->prepare("INSERT INTO bookings (flight_id, user_id, passengers) VALUES (?, ?, ?)");
        $stmt->execute([$flightId, $this->userid, $passengers]);
    }

    private function calculateDistance($depLat, $depLong, $arrLat, $arrLong)
    {
        $lat1 = deg2rad($depLat);
        $lat2 = deg2rad($arrLat);

        $long1 = deg2rad($depLong);
        $long2 = deg2rad($arrLong);

        $deltaLat = $lat2 - $lat1;
        $deltaLong = $long2 - $long1;

        $havTheta = sin($deltaLat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($deltaLong / 2) ** 2;

        $theta = 2 * asin(sqrt($havTheta));

        return 6377 * $theta;
    }

    private function calculateFlightTime($distance, $plane)
    {
        $speed = $plane['max_speed_kmh'];
        $seats = $plane['seats'];
        $cargo = $plane['max_cargo_kg'];

        $vc = ($speed) * (1 - 0.2 * ($cargo / ($cargo + 80 * $seats)));

        if ($seats > 300) {
            $tcb = 20;
        } else if ($seats > 200) {
            $tcb = 15;
        } else if ($seats > 100) {
            $tcb = 10;
        } else if ($seats > 50) {
            $tcb = 7;
        } else {
            $tcb = 5;
        }

        $tcd = $tcb * (1 - exp(-0.001 * $distance));
        $cruise_hours = $distance / $vc;
        $cruise_minutes = $cruise_hours * 60;

        return (int)($cruise_minutes + $tcd + 15);
    }
}

class FlightsService
{
    private $db;
    private $data;
    private $currentUserId;

    public function __construct($db, $data, $currentUserId = null)
    {
        $this->db = $db;
        $this->data = $data;
        $this->currentUserId = $currentUserId;
    }

    public function getAllFlights()
    {
        try {
            $user = $this->getUser();

            if ($user['type'] === 'Passenger') {
                $flights = $this->getPassengerFlights();
            } else {
                $flights = $this->getATCFlights();
            }

            return [
                'status' => 'success',
                'data' => $flights,
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return [
                'status' => 'error',
                'data' => 'Failed to retrieve flights',
                'responseCode' => 500
            ];
        }
    }

    public function getFlight()
    {
        if (empty($this->data['flight_id'])) {
            return [
                'status' => 'error',
                'data' => 'Missing flight_id.',
                'responseCode' => 400
            ];
        }

        try {
            $user = $this->getUser();
            $flight = $this->getFlightById();

            if (!$flight) {
                return [
                    'status' => 'error',
                    'data' => 'Flight not found.',
                    'responseCode' => 404
                ];
            }

            if ($user['type'] === 'Passenger') {
                if (!$this->isPassengerBooked()) {
                    return [
                        'status' => 'error',
                        'data' => 'Passenger not booked on flight.',
                        'responseCode' => 403
                    ];
                }
                return [
                    'status' => 'success',
                    'data' => ['flight' => $flight],
                    'responseCode' => 200
                ];
            } else {
                $passengerList = $this->getPassengerList();
                return [
                    'status' => 'success',
                    'data' => [
                        'flight' => $flight,
                        'passengers' => $passengerList
                    ],
                    'responseCode' => 200
                ];
            }
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return [
                'status' => 'error',
                'data' => 'Failed to retrieve flights',
                'responseCode' => 500
            ];
        }
    }

    public function boardFlight()
    {
        if (empty($this->data['flight_id'])) {
            return [
                'status' => 'error',
                'data'   => 'Missing flight_id.',
                'responseCode' => 400
            ];
        }
        try {
            $user = $this->getUser();
            $flightId = (int) $this->data['flight_id'];
            $flight = $this->getFlightById();

            if (!$flight) {
                return [
                    'status' => 'error',
                    'data'   => 'Flight not found.',
                    'responseCode' => 404
                ];
            }


            if ($user['type'] !== 'Passenger') {
                return [
                    'status' => 'error',
                    'data'   => 'Only passengers can board flights.',
                    'responseCode' => 403
                ];
            }
            $booking = $this->getPassengerBooking($this->currentUserId, $flightId);

            if (!$booking) {
                return [
                    'status' => 'error',
                    'data'   => 'You are not booked on this flight.',
                    'responseCode' => 403
                ];
            }


            if ($flight['status'] !== 'Boarding') {
                return [
                    'status' => 'error',
                    'data'   => 'Flight is not in Boarding state.',
                    'responseCode' => 400
                ];
            }

            if (!$this->isBoardingWindowOpen($flight['dispatched_at'])) {
                return [
                    'status' => 'error',
                    'data'   => 'Boarding window has expired.',
                    'responseCode' => 400
                ];
            }

            $stmt = $this->db->prepare("UPDATE passenger_flights
            SET boarding_confirmed = 1,
            confirmed_at = NOW()
            WHERE passenger_id = ?
            AND flight_id = ?");

            $stmt->execute([$this->currentUserId, $flightId]);

            return [
                'status' => 'success',
                'data'   => [
                    'message' => 'Boarding confirmed',
                    'flight_id' => $flightId
                ],
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return [
                'status' => 'error',
                'data' => 'Unable to board flight',
                'responseCode' => 500
            ];
        }
    }

    public function dispatchFlight()
    {
        try {
            if (empty($this->data['flight_id'])) {
                return [
                    'status' => 'error',
                    'data' => 'Missing flight_id.',
                    'responseCode' => 400
                ];
            }

            $user = $this->getUser();
            $flight = $this->getFlightById();

            if (!$flight) {
                return [
                    'status' => 'error',
                    'data' => 'Flight not found.',
                    'responseCode' => 404
                ];
            }

            if ($user['type'] !== "ATC") {
                return [
                    'status' => 'error',
                    'data' => 'User is not ATC.',
                    'responseCode' => 403
                ];
            }

            if ($flight['status'] !== 'Scheduled') {
                return [
                    'status' => 'error',
                    'data' => 'Flight not scheduled',
                    'responseCode' => 400
                ];
            }

            $stmt = $this->db->prepare("UPDATE skywatch_flights 
                SET status = 'Boarding',
                dispatched_at = NOW()
                WHERE id = ?");
            $stmt->execute([$this->data['flight_id']]);

            $stmt = $this->db->prepare("SELECT dispatched_at FROM skywatch_flights WHERE id = ?");
            $stmt->execute([$this->data['flight_id']]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);


            return [
                'status' => 'success',
                'data' => [
                    'flight_id' => $this->data['flight_id'],
                    'new_status' => 'Boarding',
                    'dispatched_at' => $row['dispatched_at']
                ],
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return [
                'status' => 'error',
                'data' => 'Unable to dispatch flight',
                'responseCode' => 500
            ];
        }
    }

    public function updateFlightPosition()
    {
        $flightId = $this->data['flight_id'] ?? null;
        $latitude = $this->data['latitude'] ?? 0;
        $longitude = $this->data['longitude'] ?? 0;
        $status = $this->data['status'] ?? null;

        try {

            if (empty($this->data['flight_id'])) {
                return [
                    'status' => 'error',
                    'data'   => 'Missing flight_id.',
                    'responseCode' => 400
                ];
            }

            if (!isset($this->data['latitude']) || !isset($this->data['longitude'])) {
                return [
                    'status' => 'error',
                    'data'   => 'Missing latitude or longitude.',
                    'responseCode' => 400
                ];
            }

            if ($status !== null) {
                $stmt = $this->db->prepare("UPDATE skywatch_flights
                SET current_latitude = ?,
                current_longitude = ?,
                status = ?
                WHERE id = ?");

                $stmt->execute([$latitude, $longitude, $status, $flightId]);
            } else {
                $stmt = $this->db->prepare("UPDATE skywatch_flights
                SET current_latitude = ?,
                current_longitude = ?
                WHERE id = ?");

                $stmt->execute([$latitude, $longitude, $flightId]);
            }

            if ($stmt->rowCount() === 0) {
                return [
                    'status' => 'error',
                    'data'   => 'Flight not found.',
                    'responseCode' => 404
                ];
            }

            return [
                'status' => 'success',
                'data'   => 'Position updated.',
                'responseCode' => 200
            ];
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return [
                'status' => 'error',
                'data' => 'Unable to update position',
                'responseCode' => 500
            ];
        }
    }

    private function isBoardingWindowOpen($dispatchedAt)
    {
        if ($dispatchedAt === null) {
            return false;
        }

        $dispatchTime = strtotime($dispatchedAt);
        $elapsed = time() - $dispatchTime;
        return $elapsed <= 60;
    }

    private function getUser()
    {
        $stmt = $this->db->prepare("SELECT type
            FROM users
            WHERE id = ?");
        $stmt->execute([$this->currentUserId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getPassengerBooking($passengerID, $flightID)
    {
        $stmt = $this->db->prepare("SELECT *
        FROM passenger_flights
        where passenger_id = ?
        and flight_id = ?
        ");
        $stmt->execute([$passengerID, $flightID]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getPassengerFlights()
    {
        $stmt = $this->db->prepare("SELECT pf.id AS booking_id,
            f.id as flight_id,
            f.flight_number,
            f.origin_airport_id,
            f.destination_airport_id,
            f.departure_time,
            f.status,
            f.current_latitude,
            f.current_longitude,
            f.flight_duration_hours,
            f.dispatched_at,
            pf.seat_number,
            pf.boarding_confirmed
        FROM passenger_flights pf
        JOIN skywatch_flights f on pf.flight_id = f.id
        WHERE pf.passenger_id = ?");

        $stmt->execute([$this->currentUserId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getATCFlights()
    {
        $stmt = $this->db->query(
            "SELECT id as flight_id,
                flight_number,
                origin_airport_id,
                destination_airport_id,
                departure_time,
                status,
                current_latitude,
                current_longitude,
                flight_duration_hours,
                dispatched_at
         FROM skywatch_flights
         ORDER BY departure_time"
        );
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function isPassengerBooked()
    {
        $stmt = $this->db->prepare("SELECT id 
        FROM passenger_flights
        WHERE flight_id = ?
        AND passenger_id = ?");
        $stmt->execute([$this->data['flight_id'], $this->currentUserId]);
        return (bool) $stmt->fetchColumn();
    }

    private function getFlightById()
    {
        $stmt = $this->db->prepare("SELECT
            f.id as flight_id,
            f.flight_number,
            f.origin_airport_id,
            f.destination_airport_id,
            f.departure_time,
            f.status,
            f.current_latitude,
            f.current_longitude,
            f.flight_duration_hours,
            f.dispatched_at,
            ao.latitude AS lat1,
            ao.longitude AS lon1,
            ad.latitude AS lat2,
            ad.longitude AS lon2

        FROM skywatch_flights f
        JOIN airports ao ON f.origin_airport_id = ao.id
        JOIN airports ad ON f.destination_airport_id = ad.id
        WHERE f.id = ? ");
        $stmt->execute([$this->data['flight_id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getPassengerList()
    {
        $stmt = $this->db->prepare("SELECT
        u.id as passenger_id,
        u.name,
        u.surname,
        pf.seat_number,
        pf.boarding_confirmed,
        pf.confirmed_at
        FROM users u
        JOIN passenger_flights pf on pf.passenger_id = u.id
        WHERE pf.flight_id = ? 
        ");
        $stmt->execute([$this->data['flight_id']]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

$db = Database::getInstance();
$api = new LuminaAPI($db);
$api->processRequest();
