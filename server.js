const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'villa_becerra'
};
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [filas] = await conn.execute(
            'SELECT usuario FROM usuarios WHERE usuario = ? AND password = ?', 
            [usuario, password]
        );

        if (filas.length > 0) {
            res.json({ status: 'ok', user: filas[0].usuario });
        } else {
            res.status(401).json({ status: 'error', mensaje: 'Credenciales inválidas' });
        }
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ status: 'error', mensaje: 'Error al conectar con la base de datos' });
    } finally {
        if (conn) await conn.end();
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'Becerra.html'), (err) => {
        if (err) res.status(404).send("Error: No se encontró Becerra.html");
    });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'admin.html'), (err) => {
        if (err) res.status(404).send("Error: No se encontró admin.html");
    });
});

app.post('/reservar', async (req, res) => {
    const { nombre, apellido, identidad, telefono, correo, id_cabana, fecha, metodo_pago } = req.body;
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [dup] = await conn.execute('SELECT id_reserva FROM reservas WHERE id_cabana=? AND fecha=? AND estado!="cancelado"', [id_cabana, fecha]);
        
        if (dup.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                mensaje: 'Cabaña ya reservada para esa fecha, por favor elije otra' 
            });
        }

        let [cli] = await conn.execute('SELECT id_cliente FROM clientes WHERE identidad=?', [identidad]);
        let id_cliente;
        if (cli.length > 0) { id_cliente = cli[0].id_cliente; } 
        else {
            const [ins] = await conn.execute('INSERT INTO clientes (nombre, apellido, identidad, telefono, correo, fecha_registro) VALUES (?,?,?,?,?,NOW())', [nombre, apellido, identidad, telefono, correo]);
            id_cliente = ins.insertId;
        }

        const precio = (id_cabana == '4' || id_cabana == '6') ? 2500 : 2300;
        const [r] = await conn.execute('INSERT INTO reservas (id_cliente, id_cabana, fecha, total, estado) VALUES (?,?,?,?,"pendiente")', [id_cliente, id_cabana, fecha, precio]);
        await conn.execute('INSERT INTO pagos (id_reserva, monto, metodo_pago, estado_pago) VALUES (?,?,?,"pendiente")', [r.insertId, precio, metodo_pago]);
        
        res.json({ status: 'ok', mensaje: '¡Reserva exitosa!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (conn) await conn.end(); }
});


app.get('/api/data/:tabla', async (req, res) => {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.execute(`SELECT * FROM ${req.params.tabla} ORDER BY 1 DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (conn) await conn.end(); }
});

app.put('/api/data/:tabla/:idCol/:idVal', async (req, res) => {
    const { campo, valor } = req.body;
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const valorLimpio = String(valor).toLowerCase().trim();
        
        if (req.params.tabla === 'pagos' && campo === 'estado_pago' && valorLimpio === 'pagado') {
            await conn.execute(`UPDATE pagos SET estado_pago='pagado', fecha_pago=NOW() WHERE ${req.params.idCol}=?`, [req.params.idVal]);
        } else {
            await conn.execute(`UPDATE ${req.params.tabla} SET ${campo}=? WHERE ${req.params.idCol}=?`, [valor, req.params.idVal]);
        }
        res.json({ status: 'ok' });
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (conn) await conn.end(); }
});

app.delete('/api/data/:tabla/:idCol/:idVal', async (req, res) => {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        if (req.params.tabla === 'reservas') {
            await conn.execute('DELETE FROM pagos WHERE id_reserva=?', [req.params.idVal]);
        }
        await conn.execute(`DELETE FROM ${req.params.tabla} WHERE ${req.params.idCol}=?`, [req.params.idVal]);
        res.json({ status: 'ok' });
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (conn) await conn.end(); }
});

app.listen(3000, () => {
    console.log("==========================================");
    console.log("   SERVIDOR VILLA BECERRA ACTIVO");
    console.log("   Web: http://localhost:3000");
    console.log("   Admin: http://localhost:3000/admin");
    console.log("==========================================");
});