const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static('.'));

const localUrl = "mongodb://nodo1:27017,nodo2:27018,nodo3:27019/?replicaSet=RP";
const atlasUrl = "mongodb+srv://johnssanchez_db_user:M9B0EgswFVoXZ4u6@monguito.gtpu0p4.mongodb.net/?retryWrites=true&w=majority";

const dbName = 'prueba';
const collectionName = 'usuarios';

// Clientes
const localClient = new MongoClient(localUrl, { serverSelectionTimeoutMS: 5000 });
const atlasClient = new MongoClient(atlasUrl, { serverSelectionTimeoutMS: 5000 });

let localDB = null;
let atlasDB = null;

async function conectarBases() {
    // Intento Local
    try {
        await localClient.connect();
        localDB = localClient.db(dbName);
        console.log("Conectado al clúster local");
    } catch (err) {
        console.error("Fallo en el clúster local");
    }

    // Intento Atlas
    try {
        await atlasClient.connect();
        atlasDB = atlasClient.db(dbName);
        console.log("Conectado a MongoDB Atlas");
    } catch (err) {
        console.error("Fallo en el clúster Atlas");
    }
}

// Helper para verificar salud de las conexiones
app.get('/health', (req, res) => {
    res.json({
        local: !!localDB,
        atlas: !!atlasDB
    });
});

// --- RUTAS API ---

// 1. Obtener usuarios (Local + Atlas)
app.get('/usuarios', async (req, res) => {
    const promesas = [];
    if (localDB) promesas.push(localDB.collection(collectionName).find({}).maxTimeMS(2000).toArray().catch(() => []));
    if (atlasDB) promesas.push(atlasDB.collection(collectionName).find({}).maxTimeMS(5000).toArray().catch(() => []));

    try {
        const resultados = await Promise.all(promesas);
        // Unificar las listas
        const todosLosUsuarios = resultados.flat();

        // Eliminar duplicados basados en el _id (usando un Map)
        const mapaUsuarios = new Map();
        todosLosUsuarios.forEach(u => {
            mapaUsuarios.set(u._id.toString(), u);
        });

        res.json(Array.from(mapaUsuarios.values()));
    } catch (err) {
        res.status(500).json({ error: "Error al consolidar datos" });
    }
});

// 2. Crear (Doble Escritura con ID compartido)
app.post('/usuarios', async (req, res) => {
    const syncReport = { local: 'skipped', atlas: 'skipped' };
    const promises = [];

    // GENERAMOS EL ID AQUÍ para que sea el mismo en ambas bases de datos
    const nuevoUsuario = {
        _id: new ObjectId(),
        ...req.body
    };

    if (localDB) {
        promises.push(localDB.collection(collectionName).insertOne(nuevoUsuario)
            .then(() => syncReport.local = 'success')
            .catch(() => syncReport.local = 'failed'));
    }
    if (atlasDB) {
        promises.push(atlasDB.collection(collectionName).insertOne(nuevoUsuario)
            .then(() => syncReport.atlas = 'success')
            .catch(() => syncReport.atlas = 'failed'));
    }

    await Promise.all(promises);
    res.status(201).json({ mensaje: "Usuario sincronizado", syncReport });
});

// 3. Actualizar (Doble Escritura)
app.put('/usuarios/:id', async (req, res) => {
    const id = req.params.id;
    const { _id, ...updateData } = req.body;
    const syncReport = { local: 'skipped', atlas: 'skipped' };
    const promises = [];

    if (localDB) {
        promises.push(localDB.collection(collectionName).updateOne({ _id: new ObjectId(id) }, { $set: updateData })
            .then(() => syncReport.local = 'success')
            .catch(() => syncReport.local = 'failed'));
    }
    if (atlasDB) {
        promises.push(atlasDB.collection(collectionName).updateOne({ _id: new ObjectId(id) }, { $set: updateData })
            .then(() => syncReport.atlas = 'success')
            .catch(() => syncReport.atlas = 'failed'));
    }

    await Promise.all(promises);
    res.json({ mensaje: "Actualización completada", syncReport });
});

// 4. Borrar (Doble Escritura)
app.delete('/usuarios/:id', async (req, res) => {
    const id = req.params.id;
    const syncReport = { local: 'skipped', atlas: 'skipped' };
    const promises = [];

    if (localDB) {
        promises.push(localDB.collection(collectionName).deleteOne({ _id: new ObjectId(id) })
            .then(() => syncReport.local = 'success')
            .catch(() => syncReport.local = 'failed'));
    }
    if (atlasDB) {
        promises.push(atlasDB.collection(collectionName).deleteOne({ _id: new ObjectId(id) })
            .then(() => syncReport.atlas = 'success')
            .catch(() => syncReport.atlas = 'failed'));
    }

    await Promise.all(promises);
    res.json({ mensaje: "Eliminación completada", syncReport });
});

app.listen(PORT, async () => {
    console.log(`Servidor Hibrido en: http://localhost:${PORT}`);
    await conectarBases();
});