
async function cargarCSV(ruta) {
    const res = await fetch(ruta);
    if (!res.ok) throw new Error(`No se pudo cargar ${ruta} (${res.status})`);
  
    const texto = await res.text();
    const lineas = texto.trim().split('\n');
    const encabezados = lineas[0].split(',').map(h => h.trim().replace(/\r/g, ''));
  
    return lineas.slice(1).map(linea => {
      const valores = linea.split(',').map(v => v.trim().replace(/\r/g, ''));
      const fila = {};
      encabezados.forEach((col, i) => {
        const val = valores[i];
        fila[col] = val === '' || val === undefined ? null : isNaN(val) ? val : Number(val);
      });
      return fila;
    });
  }

async function buscarPerdidaCañoRecto(caudal_m3h, diametro) {
    const tabla = await cargarCSV("recursos/perdida_caño_recto.csv");
  
    // Encontrar las dos filas que encuadran el caudal
    let inferior = null;
    let superior = null;
  
    for (let i = 0; i < tabla.length; i++) {
      const fila = tabla[i];
      if (fila.Caudal_m3h <= caudal_m3h) inferior = fila;
      if (fila.Caudal_m3h >= caudal_m3h && superior === null) superior = fila;
      if (inferior && superior) break;
    }
  
    if (!inferior && !superior) return null;           // tabla vacía
    if (!inferior) inferior = superior;                // caudal menor al mínimo
    if (!superior) superior = inferior;                // caudal mayor al máximo
  
    const perdInf = inferior[diametro];
    const perdSup = superior[diametro];
  
    if (perdInf == null || perdSup == null) return null; // diámetro sin datos para ese caudal
  
    // Interpolación lineal
    if (inferior.Caudal_m3h === superior.Caudal_m3h) return perdInf;
  
    const t = (caudal_m3h - inferior.Caudal_m3h) / (superior.Caudal_m3h - inferior.Caudal_m3h);
    return perdInf + t * (perdSup - perdInf);
}

async function buscarPerdidaAccesorio(diametro, accesorio) {
    const tabla = await cargarCSV("recursos/perdidas_accesorios.csv");
  
    // Buscar fila: acepta mm (number) o pulgadas (string)
    let fila;
    if (typeof diametro === 'number') {
      fila = tabla.find(f => f.Diametro_mm === diametro);
    } else {
      fila = tabla.find(f => f.Diametro_pulg === diametro);
    }
  
    if (!fila) return null;
  
    const valor = fila[accesorio];
    return valor != null ? valor : null;
  }

export const Cañeria_tipo = Object.freeze({
    Hierro: "hierro",
    Hierro_viejo: "hierro_viejo" ,
    Plastico: "plastico"
})


export class Cañeria{
    constructor(largo,diametro,material){
        this.largo = largo,
        this.diametro = diametro,
        this.material = material
    }

    get_perdida(caudal){
        if (Object.values(Cañeria_tipo).includes(this.material)){
            const perdida_value = this.get_data(caudal)
            const mult_value = this.largo * perdida_value
            const value = mult_value/100
            if (this.material == Cañeria_tipo.Hierro_viejo){
                return value*1.33
            } else if (this.material == Cañeria_tipo.Plastico){
                return value*0.4
            } else if (this.material == Cañeria_tipo.Hierro) {
                return value
            }
        }
    }

    get_data(caudal){
        return buscarPerdidaCañoRecto(caudal,this.diametro)
    }
}

export const accesorio_tipo = Object.freeze({
    Codo_45:"Codo_45",
    Codo_90:"Codo_90",
    Codo_180:"Codo_180",
    Curva_90:"Curva_90",
    TE:"TE",
    Valv_Retencion:"Valv_Retencion",
    Valv_Esclusa:"Valv_Esclusa"
})

export class accesorio{
    constructor(cantidad,diametro,tipo,material){
        this.cantidad = cantidad,
        this.diametro = diametro,
        this.tipo = tipo,
        this.material = material
    }

    get_perdida(){
        if (Object.values(Cañeria_tipo).includes(this.material)){
            const perdida_value = this.get_data()
            const value = this.largo * perdida_value
            if (this.material == Cañeria_tipo.Hierro_viejo){
                return value*1.33
            } else if (this.material == Cañeria_tipo.Plastico){
                return value*0.4
            } else if (this.material == Cañeria_tipo.Hierro) {
                return value
            }
        }
    }

    get_data(){
        return buscarPerdidaAccesorio(this.diametro,this.tipo)
    }
}

export function get_alture(alture,cañeria){}