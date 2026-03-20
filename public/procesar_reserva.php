<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "villa_becerra";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

$nombre = $_POST['nombre'];
$apellido = $_POST['apellido'];
$identidad = $_POST['identidad'];
$telefono = $_POST['telefono'];
$correo = $_POST['correo'];
$id_cabana = $_POST['id_cabana'];
$fecha = $_POST['fecha'];
$metodo_pago = $_POST['metodo_pago'];

$sql_check = "SELECT * FROM reservas 
              WHERE id_cabana='$id_cabana' 
              AND fecha='$fecha' 
              AND estado='Pendiente'";
$result = $conn->query($sql_check);

if ($result->num_rows > 0) {
    echo "<script>alert('Esta cabaña ya está reservada para esa fecha.');window.history.back();</script>";
    $conn->close();
    exit;
}

$sql_buscar = "SELECT id_cliente FROM clientes WHERE identidad='$identidad'";
$result_cliente = $conn->query($sql_buscar);

if ($result_cliente->num_rows > 0) {
    $row = $result_cliente->fetch_assoc();
    $id_cliente = $row['id_cliente'];
} else {
    $sql_cliente = "INSERT INTO clientes 
    (nombre, apellido, identidad, telefono, correo, fecha_registro) 
    VALUES 
    ('$nombre','$apellido','$identidad','$telefono','$correo',NOW())";
    
    $conn->query($sql_cliente);
    $id_cliente = $conn->insert_id;
}

$precios = [1=>2300,2=>2300,3=>2300,4=>2500,5=>2300,6=>2500];
$total = $precios[$id_cabana];

$sql_reserva = "INSERT INTO reservas 
(id_cliente, id_cabana, fecha, total, estado) 
VALUES 
('$id_cliente','$id_cabana','$fecha','$total','Pendiente')";

if ($conn->query($sql_reserva)) {

    $id_reserva = $conn->insert_id;

    $sql_pago = "INSERT INTO pagos 
    (id_reserva, monto, metodo_pago, fecha_pago, estado_pago)
    VALUES 
    ('$id_reserva','$total','$metodo_pago',NULL,'Pendiente')";

    if ($conn->query($sql_pago)) {
        echo "<script>alert('Reserva realizada correctamente');window.location='index.html';</script>";
    } else {
        echo "<script>alert('Error al registrar el pago');window.history.back();</script>";
    }

} else {
    echo "<script>alert('Error al realizar la reserva');window.history.back();</script>";
}

$conn->close();
?>