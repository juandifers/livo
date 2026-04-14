import React from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../../i18n';

const PRIVACY_POLICY_URL = 'https://livo.co/politica-de-tratamiento-de-datos-personales/';

const PRIVACY_POLICY_TEXT = `POLÍTICA DE PRIVACIDAD Y PROTECCIÓN
DE DATOS PERSONALES PARA CLIENTES LIVO
COLOMBIA S.A.S.

I. Objetivo

El objetivo de la presente Política de Privacidad y Protección de Datos Personales (en adelante «Política de Privacidad») es dar cumplimiento a las normas vigentes en materia de Protección de Datos Personales en Colombia.

II. Alcance

La presente Política de Privacidad es aplicable tanto a Livo Colombia S.A.S. (en adelante Livo), en calidad de responsable del tratamiento, y a sus empleados directos e indirectos, como a todas aquellas terceras personas naturales o jurídicas a quienes transmitan datos personales de los titulares que comprenden los grupos de interés del responsable del tratamiento, cuando estos realicen algún tratamiento sobre los mismos por encargo del responsable del tratamiento.

III. Identificación del responsable del tratamiento

Razón Social: Livo Colombia S.A.S.
Domicilio: Cartagena, Bolívar
Correo electrónico: info@livo.co

IV. Definiciones

Para los efectos de la presente Política de Privacidad, se entenderá por:

Adolescente
Significa personas entre 12 y 18 años de edad.

Autorización
Significa el consentimiento previo, expreso e informado del titular de datos personales para llevar a cabo el tratamiento de sus datos personales, la cual puede ser recolectada de manera (i) escrita, (ii) oral o (iii) mediante conductas inequívocas, que permitan concluir de manera razonable que este otorga la autorización.

Aviso de Privacidad
Significa el documento físico, electrónico o en cualquier otro formato generado por el responsable del tratamiento, que se pone a disposición del titular para el tratamiento de sus datos personales. En el aviso de privacidad se comunica al titular la siguiente información: i) Nombre o razón social y datos de contacto del responsable del tratamiento; ii) el tratamiento al cual serán sometidos los datos y la finalidad del mismo; iii) los derechos que le asisten al titular; y iv) los mecanismos dispuestos por el responsable para que el titular conozca la política de tratamiento de la información y los cambios sustanciales que se produzcan en ella o en el Aviso de Privacidad correspondiente.

Base de Datos
Significa el conjunto organizado de datos personales físico o electrónico (digital) que sea objeto de tratamiento manual o automatizado, establecidos en una o varias ubicaciones.

Datos personales
Significa cualquier información vinculada o que pueda asociarse a una o varias personas naturales o físicas determinadas o determinables. La naturaleza de los datos personales puede ser pública, semiprivada, privada o sensible. Los datos podrán ser recolectados por parte del responsable del tratamiento directamente del titular, por terceros que se la remitan y/o por fuentes de acceso público (incluyendo, pero sin limitarse a: redes sociales, páginas web y/o plataformas de entidades públicas o privadas), garantizando en todo momento los derechos que le asisten a los titulares.

Los datos personales que podrán ser recolectados y tratados, son entre otros, los siguientes: nombre, edad, identificación, nacionalidad, datos personales de contacto, datos personales de ubicación, datos académicos, datos laborales, datos personales fiscales y datos personales financieros y/o patrimonios.

Dato privado
Significa el dato que por su naturaleza íntima o reservada sólo es relevante para el titular.

Dato público
Significa el dato calificado como tal según los mandatos de la ley o de la Constitución Política y aquel que no sea semiprivado, privado o sensible.

Datos sensibles
Significan aquellos que afectan la intimidad del titular de datos personales o cuyo uso indebido puede generar su discriminación, tales como aquellos que revelen el origen racial o étnico, la orientación política, las convicciones religiosas o filosóficas, la pertenencia a sindicatos, organizaciones sociales, de derechos humanos o que promueva intereses de cualquier partido político o que garanticen los derechos y garantías de partidos políticos de oposición así como los datos relativos a la salud, a la vida sexual y los datos biométricos (huella dactilar, iris del ojo, voz, forma de caminar, palma de la mano o los rasgos del rostro, fotografías, videos, entre otros). A los datos personales de niños, niñas y/o adolescentes, se les aplicarán las mismas normas y procedimientos que a los datos sensibles, y no se le dará tratamiento alguno que pueda vulnerar o amenazar su desarrollo físico, mental y emocional.

Datos semiprivados
Significan aquellos que no tienen una naturaleza íntima, reservada, ni pública y cuyo conocimiento o divulgación puede interesar no solo a su titular, sino a un grupo de personas o a la sociedad en general. Se entiende por dato semiprivado, entre otros, la información relacionada con seguridad social y con el comportamiento financiero y crediticio.

Encargado del tratamiento
Significa cualquier persona natural o jurídica, pública o privada, que por sí misma o en asocio con otros, realice el tratamiento de datos personales por cuenta del responsable del tratamiento.

Niño o niña
Significan las personas entre los 0 y 12 años de edad.

Oficial de protección de datos personales
Es la persona o área responsable de velar porque se atiendan las PQRSD que se presenten en materia de protección de datos personales y de velar porque se cumplan las políticas, directrices y procedimientos que conforman el Programa de Protección de Datos Personales.

Plataforma
Significa el market place digital y físico para la adquisición de los servicios ofrecidos por Livo, a través del sitio web, apps y/o cualquier otro canal que en el futuro implemente el responsable del tratamiento. Los términos y condiciones de la plataforma vigentes forman parte integral de la presente Política de Privacidad.

PQRSD
Significan las peticiones, quejas, consultas, sugerencias, reclamos y denuncias en materia de protección de datos personales.

Protección de datos
Son todas las medidas técnicas, humanas y administrativas que sean necesarias para otorgar seguridad a los registros evitando su adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento.

Responsable del tratamiento
Significa la persona natural o jurídica, pública o privada, que por sí misma o en asocio con otros, decida sobre la base de datos y/o el tratamiento de los datos.

Titular
Significa la persona natural o física cuyos datos personales sean objeto de tratamiento.

Transferencia
La transferencia de datos tiene lugar cuando el responsable y/o encargado del tratamiento de datos personales envía la información o los datos personales a un receptor, que a su vez es responsable del tratamiento y se encuentra dentro o fuera del país.

Transmisión
Corresponde al tratamiento de datos personales que implica la comunicación de los mismos dentro o fuera del país de domicilio del responsable del tratamiento, cuando tenga por objeto la realización de un tratamiento por el encargado por cuenta del responsable.

Tratamiento
Significa cualquier operación o conjunto de operaciones sobre datos personales, tales como la recolección, almacenamiento, actualización, uso, circulación, transferencia, transmisión o supresión.

Usuario
Significan las personas que utilizan el sitio web, apps o los canales que disponga Livo, bien sea en calidad de comprador, cliente u otro.

Usuario cliente
Es la persona que utiliza el sitio web, apps o los canales que disponga Livo, para adquirir y/o utilizar los servicios ofrecidos por Livo.

V. Principios rectores

Los siguientes son los principios rectores en materia de protección de datos personales, y aplicarán al tratamiento que realicen el responsable de tratamiento, sus empleados y todas aquellas terceras personas naturales o jurídicas a quienes transmita o transfiera datos personales de los titulares que comprenden sus grupos de interés, cuando estos realicen algún tratamiento sobre los mismos.

Principio de legalidad en el tratamiento de datos personales:
El tratamiento de datos personales a que se refiere la Ley Estatutaria 1581 de 2012 es una actividad reglada que debe sujetarse a lo establecido en ella y en las demás disposiciones que la desarrollen.

Principio de finalidad:
El tratamiento de los datos personales debe obedecer a una finalidad legítima de acuerdo con la Constitución y la ley, la cual debe ser informada al titular.

Principio de libertad:
El tratamiento de los datos personales sólo puede ejercerse con el consentimiento, previo, expreso e informado del titular. Los datos personales no podrán ser obtenidos o divulgados sin previa autorización, o en ausencia de mandato legal o judicial que releve el consentimiento. Quedan exceptuados de este principio los datos públicos, los cuales podrán ser objeto de tratamiento sin que se requiera autorización del titular, conforme con lo dispuesto por las normas vigentes.

Principio de veracidad o calidad:
La información sujeta a tratamiento debe ser veraz, completa, exacta, actualizada, comprobable y comprensible. Se prohíbe el tratamiento de datos parciales, incompletos, fraccionados o que induzcan a error.

Principio de transparencia:
En el tratamiento debe garantizarse el derecho del titular a obtener en cualquier momento y sin restricciones, información acerca de la existencia de datos que le conciernan.

Principio de acceso y circulación restringida:
Los datos personales, salvo la información pública, no podrán estar disponibles en Internet u otros medios de divulgación o comunicación masiva, salvo que el acceso sea técnicamente controlable para brindar un conocimiento restringido sólo a los titulares o terceros autorizados.

Principio de seguridad:
La información sujeta a tratamiento se deberá proteger mediante el uso de las medidas técnicas, humanas y administrativas que sean necesarias para otorgar seguridad a los registros, evitando su adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento.

Principio de confidencialidad:
Todas las personas que intervengan en el tratamiento de datos personales están obligadas a garantizar la reserva de la información, inclusive después de finalizada su relación con alguna de las labores que comprende el tratamiento.

VI. Tratamientos a los cuales serán sometidos los datos personales y sus finalidades

Para los efectos de la presente Política de Privacidad, el responsable del tratamiento directamente o a través de encargados del tratamiento, podrá recolectar, almacenar, usar, circular, actualizar, suprimir o realizar cualquier otro tipo de tratamiento sobre los datos personales de sus grupos de interés, ajustándose en todo momento a lo dispuesto por las normas vigentes y para las finalidades que se describen a continuación.

6.1. Finalidades generales para el tratamiento de datos personales de diferentes grupos de interés

- Identificación de los titulares.
- Transmisión y transferencia nacional e internacional y almacenamiento y custodia de información y/o datos personales en archivos físicos o servidores propios y/o de terceros, ubicados dentro o fuera del país.
- Implementación de medidas de seguridad y restricción de acceso a las bases de datos y de información en general.
- Conservación de la información con fines comerciales, históricos, científicos y estadísticos.
- Garantizar el ejercicio de cualquier derecho de los titulares.
- Registro y control de entrada y salida de documentos.
- Administración de sistemas de información, gestión de claves, administración de usuarios, etc.
- Planeación, control, medición y seguimiento del impacto de las decisiones tomadas al interior de la organización y análisis de impacto de factores externos.
- Diseño, elaboración e implementación de estrategias y metas para optimizar recursos económicos, tecnológicos y humanos.
- Envío de comunicaciones relacionadas con las finalidades contenidas en la presente política de privacidad y las actividades propias del responsable del tratamiento.
- Marketing y remarketing.
- Ofrecimiento de bienes y/o servicios del responsable del tratamiento y/o de sus aliados estratégicos.
- Campañas de actualización de datos del titular, su empleador o contratante.
- Controles, estadísticas e históricos de las relaciones mantenidas con los titulares.
- Soporte en procesos de auditorías internas y/o externas, revisorías fiscales, consultorías e implementación de planes de mejora.
- Control y prevención del fraude, control y prevención de lavado de activos/dinero y financiación del terrorismo.
- Reportes ante autoridades administrativas y judiciales competentes.
- Atención de requerimientos realizados por autoridades administrativas y judiciales competentes.
- Elaboración y presentación de demandas y denuncios ante las autoridades competentes, así como ejercer el derecho de defensa en cualquier proceso administrativo y/o judicial.
- Cumplimiento a las obligaciones derivadas de los contratos suscritos entre el responsable del tratamiento y los titulares.
- Gestión administrativa, financiera y contable, creación de terceros y registro en las bases de datos del responsable del tratamiento.
- Elaboración, registro y control de información financiera y contable.
- Gestión fiscal y generación de información tributaria.
- Atención de PQRSD.
- Contratación de pólizas de seguros y solicitud de amparos.
- Solicitud de créditos o servicios financieros.
- Demás finalidades indicadas en la presente política de privacidad, en la autorización otorgada por el titular y/o en los avisos de privacidad.

6.2. Finalidades generales para el tratamiento de datos personales de usuarios clientes

- Análisis de comportamiento, hábitos de consumo, perfiles y segmentación del mercado.
- Marketing y remarketing.
- Realizar acciones o comunicaciones comerciales y/o publicitarias, por cualquier medio, incluso mediante comunicaciones electrónicas o equivalentes.
- Realizar perfilamientos con base en los datos personales proporcionados para conocer los productos y servicios que más se ajustan al perfil del titular.
- Realizar encuestas de satisfacción relacionadas con los productos y servicios contratados.
- Grabar voz o imagen y conservar conversación telefónica y/o video para mantener la calidad del servicio y protegerse en caso de reclamaciones judiciales.
- Gestión de registro como usuario cliente de nuestros servicios.
- Transferencia de datos personales a sociedades vinculadas y demás proveedores, empresas de pagos, entidades financieras, aseguradoras, subsidiarias, controladoras y filiales.
- Acreditar la identidad y verificar la información proporcionada.
- Gestionar la solicitud y búsqueda de los servicios solicitados.
- Contacto para realizar aclaraciones y seguimiento sobre el uso de la plataforma.
- Realizar las actividades necesarias para la prestación de los servicios.
- Evaluar, monitorear y registrar la actividad y uso de la plataforma y de los servicios de Livo, aliados y vinculados económicos.
- Prevenir fraudes o posibles conductas ilícitas.
- Gestionar pagos a través de los diversos medios de pago permitidos por la plataforma de Livo.
- Llevar a cabo actividades de facturación y cobranza.
- Gestionar actividades encaminadas a promover, mantener y mejorar los servicios de Livo, aliados o vinculados económicos.
- Evaluar el nivel de satisfacción respecto a los servicios ofrecidos.
- Gestión de cancelación y reembolsos.
- Gestión de reclamaciones.
- Transmisión y transferencia de datos de contacto a encargados del tratamiento, filiales, controladoras o subsidiarias, contratistas, proveedores y/o aliados estratégicos para los fines indicados en la presente política de privacidad.
- Fidelización de usuarios clientes y reconocimiento de beneficios y servicio postventa.

VII. Derechos de los titulares

Son derechos de los titulares de datos personales:

(i) Conocer, actualizar y rectificar sus datos personales frente a los responsables del tratamiento o encargados del tratamiento.
(ii) Solicitar prueba de la autorización otorgada al responsable del tratamiento salvo cuando expresamente se exceptúe como requisito para el tratamiento.
(iii) Ser informado por el responsable del tratamiento o el encargado del tratamiento, previa solicitud, respecto al uso que le ha dado a sus datos personales.
(iv) Presentar quejas por infracciones a lo dispuesto en las normas vigentes ante la Superintendencia de Industria y Comercio.
(v) Revocar la autorización y/o solicitar la supresión del dato cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.
(vi) Acceder en forma gratuita a los datos personales que hayan sido objeto de tratamiento.

La solicitud de supresión de la información y la revocatoria de la autorización no procederán cuando el titular tenga un deber legal o contractual de permanecer en la base de datos.

VIII. Deberes del responsable del tratamiento

Es deber del responsable del tratamiento:

(i) Garantizar al titular, en todo tiempo, el pleno y efectivo ejercicio del derecho de hábeas data.
(ii) Solicitar y conservar por cualquier medio y en las condiciones previstas en las normas vigentes, copia de la respectiva autorización otorgada por el titular.
(iii) Informar debidamente al titular sobre la finalidad de la recolección y los derechos que le asisten por virtud de la autorización otorgada.
(iv) Conservar la información bajo las condiciones de seguridad necesarias para impedir su adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento.
(v) Garantizar que la información que se suministre al encargado del tratamiento sea veraz, completa, exacta, actualizada, comprobable y comprensible.
(vi) Actualizar la información, comunicando de forma oportuna al encargado del tratamiento todas las novedades respecto de los datos que previamente le haya suministrado.
(vii) Rectificar la información cuando sea incorrecta y comunicar lo pertinente al encargado del tratamiento.
(viii) Suministrar al encargado del tratamiento únicamente datos cuyo tratamiento esté previamente autorizado de conformidad con lo previsto en las normas vigentes.
(ix) Exigir al encargado del tratamiento en todo momento, el respeto a las condiciones de seguridad y privacidad de la información del titular.
(x) Tramitar las PQRSD formuladas en los términos señalados en las normas vigentes.
(xi) Adoptar un manual interno de políticas y procedimientos para garantizar el adecuado cumplimiento de las normas vigentes y en especial para la atención de PQRSD.
(xii) Informar al encargado del tratamiento cuando determinada información se encuentra en discusión por parte del titular.
(xiii) Informar a solicitud del titular sobre el uso dado a sus datos.
(xiv) Informar a la autoridad de protección de datos cuando se presenten violaciones a los códigos de seguridad y existan riesgos en la administración de la información de los titulares.
(xv) Cumplir las instrucciones y requerimientos que impartan las autoridades competentes en la materia.

IX. Deberes de los encargados del tratamiento

Es deber del encargado del tratamiento:

(i) Cumplir en el desarrollo de las actividades contratadas con la Política de Privacidad y Protección de Datos Personales, así como con procedimientos, guías y/o directrices del responsable del tratamiento.
(ii) Adoptar, según instrucciones del responsable del tratamiento, las medidas técnicas, humanas y administrativas necesarias para otorgar seguridad a los registros.
(iii) Implementar una política de protección de datos personales que se ajuste a lo dispuesto por las normas que regulan la materia.
(iv) Dar tratamiento a los datos personales conforme a las instrucciones que reciba expresamente del responsable del tratamiento.
(v) Abstenerse de suministrar, ceder o comercializar los datos personales con terceras personas, salvo que sea requerido por autoridad competente.
(vi) Guardar estricta confidencialidad respecto de los datos personales.
(vii) Acceder o consultar la información o datos personales de las bases de datos del responsable del tratamiento únicamente cuando sea estrictamente necesario.
(viii) Reportar al responsable del tratamiento de manera inmediata cualquier incidente o amenaza de incidente que afecte o pueda afectar la protección de datos personales.
(ix) Garantizar en todo tiempo el pleno y efectivo ejercicio del derecho de hábeas data de los titulares.
(x) Realizar oportunamente la actualización, rectificación o supresión de los datos en los términos establecidos en las normas vigentes.
(xi) Actualizar la información reportada por el responsable del tratamiento dentro de los cinco (5) días hábiles contados a partir de su recibo.
(xii) Adoptar un manual interno de políticas y procedimientos para garantizar el adecuado cumplimiento de las normas vigentes y, en especial, para la atención de PQRSD.
(xiii) Abstenerse de circular información que esté siendo controvertida por el titular y cuyo bloqueo haya sido ordenado por una autoridad competente.
(xiv) Permitir el acceso a la información únicamente a las personas que pueden tener acceso a ella.
(xv) Cumplir las instrucciones y requerimientos que imparta una autoridad competente.
(xvi) En caso de recolectar datos por cuenta del responsable del tratamiento, requerir la autorización de los titulares cuando se requiera conforme a normas vigentes.

X. Oficial de protección de datos personales

El área o persona que ejercerá las funciones de oficial de protección de datos personales será el área de atención al cliente, quien velará entre otras por la adecuada garantía de los derechos de los titulares, en especial la atención de PQRSD.

XI. Procedimiento para que los titulares de la información puedan ejercer los derechos

Los titulares o aquellas personas que se encuentren legitimadas por normas vigentes pueden presentar PQRSD a través del siguiente canal:

Correo electrónico: info@livo.co

Las siguientes son las personas facultadas para presentar PQRSD:

- El titular, quien deberá acreditar su identidad en forma suficiente.
- Los causahabientes del titular, quienes deberán acreditar tal calidad.
- El representante y/o apoderado del titular, previa acreditación de la representación o apoderamiento.
- Por estipulación a favor de otro o para otro, siempre que medie la aceptación por parte del titular.

Los derechos de los niños, niñas o adolescentes se ejercerán por las personas que estén facultadas para representarlos.

Las PQRSD deberán contener como mínimo: i) nombre y domicilio u otro medio para comunicar la respuesta; ii) documentos que acrediten identidad o representación legal; iii) descripción clara y precisa de los datos personales respecto de los que se solicita ejercer derechos; iv) manifestación expresa para revocar consentimiento, si aplica; y v) cualquier otro elemento que facilite la localización de los datos personales.

Las peticiones, quejas, reclamos y denuncias serán resueltas dentro de los quince (15) días hábiles siguientes a su presentación.

Las consultas deberán resolverse dentro de los diez (10) días hábiles siguientes a su presentación.

XII. Vigencia

La presente Política de Privacidad y Protección de Datos Personales rige a partir del 19 febrero de 2023.

Las bases de datos sujetas a tratamiento por parte del responsable del tratamiento estarán vigentes mientras subsistan las finalidades para las cuales se recolectaron los datos y/o el término que establezca la ley.

El responsable del tratamiento se reserva el derecho de modificar en cualquier momento la presente política de privacidad. En caso de cambios sustanciales en su contenido, en relación con la identificación del responsable del tratamiento y la finalidad del tratamiento de los datos personales, que puedan afectar el contenido de la autorización, el responsable del tratamiento comunicará estos cambios al titular antes de o a más tardar al momento de implementar las nuevas políticas y requerirá una nueva autorización cuando el cambio se refiera a la finalidad del tratamiento.`;

const PrivacyPolicyScreen = ({ navigation }) => {
  const { t } = useI18n();

  const handleOpenOfficialPolicy = async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (!supported) {
        Alert.alert(t('Error'), 'No fue posible abrir el enlace de política de privacidad.');
        return;
      }
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (_error) {
      Alert.alert(t('Error'), 'No fue posible abrir el enlace de política de privacidad.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('← Back to Settings')}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>POLÍTICA DE PRIVACIDAD</Text>
          <Text style={styles.company}>Y PROTECCIÓN DE DATOS PERSONALES</Text>

          <TouchableOpacity onPress={handleOpenOfficialPolicy} activeOpacity={0.7}>
            <Text style={styles.link}>{PRIVACY_POLICY_URL}</Text>
          </TouchableOpacity>

          <Text style={styles.paragraph}>{PRIVACY_POLICY_TEXT}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  backButtonText: {
    color: '#1E4640',
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E4640',
    marginBottom: 2,
  },
  company: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
    marginBottom: 14,
    fontSize: 12,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 16,
    color: '#374151',
  },
});

export default PrivacyPolicyScreen;
