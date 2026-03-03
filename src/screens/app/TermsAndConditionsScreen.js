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

const TERMS_URL = 'https://livo.co/terminos-y-condiciones/';

const Heading = ({ children }) => <Text style={styles.heading}>{children}</Text>;
const SubHeading = ({ children }) => <Text style={styles.subHeading}>{children}</Text>;
const Paragraph = ({ children }) => <Text style={styles.paragraph}>{children}</Text>;
const ListItem = ({ children }) => <Text style={styles.listItem}>{children}</Text>;

const TermsAndConditionsScreen = ({ navigation }) => {
  const { t } = useI18n();

  const handleOpenOfficialTerms = async () => {
    try {
      const supported = await Linking.canOpenURL(TERMS_URL);
      if (!supported) {
        Alert.alert(t('Error'), 'No fue posible abrir el enlace de términos y condiciones.');
        return;
      }
      await Linking.openURL(TERMS_URL);
    } catch (_error) {
      Alert.alert(t('Error'), 'No fue posible abrir el enlace de términos y condiciones.');
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
          <Text style={styles.title}>TÉRMINOS Y CONDICIONES</Text>
          <Text style={styles.company}>LIVO COLOMBIA S.A.S.</Text>

          <TouchableOpacity onPress={handleOpenOfficialTerms} activeOpacity={0.7}>
            <Text style={styles.link}>{TERMS_URL}</Text>
          </TouchableOpacity>

          <Paragraph>
            En el presente documento se establecen los términos y condiciones generales (en adelante los “Términos y
            Condiciones”) que regulan la relación entre Livo Colombia S.A.S., sociedad colombiana, debidamente
            constituida, identificada con N.I.T. 901.617.666 – 2 (en adelante el “Titular” o “Livo”) y todos los
            usuarios (en adelante y conjuntamente los “Usuarios”) que ingresen al sitio web https://livo.co/ (en
            adelante la “Plataforma”), para consultar la información y/o solicitar uno de los tres servicios ofrecidos
            en esta: (i) adquirir parcialmente los inmuebles (Casas Livo) ofrecidos por Livo; (ii) vender total o
            parcialmente inmuebles de su propiedad a través de Livo y; (iii) gestionar la administración de sus
            inmuebles a través de Livo (en adelante los “Servicios”).
          </Paragraph>

          <Paragraph>
            Los Usuarios que deseen acceder a la Plataforma podrán hacerlo sujetándose a los presentes Términos y
            Condiciones, los cuales se entenderán aceptados con el sólo acceso a la Plataforma. En todo caso, quien no
            acepte los presentes Términos y Condiciones, deberá abstenerse de utilizarla. Livo podrá actualizar,
            modificar o reemplazar unilateralmente parte o la totalidad de los Términos y Condiciones, los cuales
            serán vinculantes para todos los Usuarios a partir de su publicación, por lo que los Usuarios tienen la
            responsabilidad de revisarlos periódicamente para estar al tanto de los cambios y actualizaciones de estos.
          </Paragraph>

          <Paragraph>
            Livo podrá administrar o gestionar la Plataforma de manera directa o a través de un tercero, así como
            modificar la presentación, contenidos, funcionalidad, información, Servicios y configuración de la
            Plataforma, lo cual no modifica en ningún sentido lo establecido en los presentes Términos y Condiciones.
          </Paragraph>

          <Heading>I. Información de contacto</Heading>
          <Paragraph>Correo electrónico: info@livo.co</Paragraph>

          <Heading>II. Descripción de la Plataforma y Servicios</Heading>
          <SubHeading>a. De la Plataforma</SubHeading>
          <Paragraph>
            La Plataforma permite a los Usuarios realizar, de manera libre y gratuita, las siguientes actividades: (i)
            crear un usuario y registrarse en la App; (ii) consultar los Servicios ofrecidos por Livo y el detalle de
            esos; (iii) acceder a la información y descripción de los inmuebles (Casas Livo) ofrecidos por Livo; (iv)
            solicitar los Servicios ofrecidos, brindando la información de contacto del Usuario para ser contactado por
            un experto inmobiliario y; (v) suscribirse al newsletter de Livo.
          </Paragraph>

          <SubHeading>b. De los Servicios</SubHeading>
          <Paragraph>
            A través de la Plataforma se podrá consultar el detalle de los siguientes Servicios ofrecidos por Livo:
          </Paragraph>

          <SubHeading>1. Adquirir parcialmente inmuebles ofrecidos por Livo</SubHeading>
          <Paragraph>
            La plataforma exhibe los inmuebles que podrán ser adquiridos parcialmente por los Usuarios, esto es, Livo
            ofrece la posibilidad de ser copropietario de un inmueble que se encuentra fraccionado en 8 partes de
            propiedad, de las cuales se podrá adquirir entre 1/8 y 1/2.
          </Paragraph>
          <Paragraph>
            Cada parte de propiedad otorga a los Usuarios ciertos derechos en relación con el inmueble, entre otros, la
            propiedad sobre la casa, el lote y los accesorios de esta (muebles, electrodomésticos, etc.), el número de
            noches que podrá utilizar el inmueble en el año, el número de reservas de estadía activas que podrá tener
            el Usuario, el número de fechas especiales que podrá utilizar el inmueble en el año y la duración máxima de
            cada estadía.
          </Paragraph>
          <Paragraph>Para adquirir la propiedad en estos inmuebles, deberá seguirse el siguiente proceso:</Paragraph>
          <ListItem>i. Ingresar a la Plataforma para conocer el catálogo de inmuebles disponibles.</ListItem>
          <ListItem>ii. Seleccionar el inmueble de interés.</ListItem>
          <ListItem>
            iii. Solicitar a Livo agendar una llamada con el experto inmobiliario para conocer los detalles del
            inmueble, así como de los acuerdos operativos y acuerdos de gestión.
          </ListItem>
          <ListItem>iv. En caso de estar interesado, decidir la proporción en que se adquirirá el inmueble.</ListItem>
          <ListItem>
            v. Livo realizará un proceso de investigación de copropietarios, donde se validará la identidad del
            Usuario, se realizará una verificación de crédito y se requerirá información de la situación laboral y
            activos del Usuario interesado.
          </ListItem>
          <ListItem>
            vi. Firma de contratos, de cesión de la propiedad del inmueble y de los acuerdos operativos y de gestión.
          </ListItem>
          <ListItem>
            vii. Pago del precio de venta, el cual incluye la parte de propiedad del inmueble adquirida, tasas de
            cierre, mejora de vivienda y servicio de Livo.
          </ListItem>
          <ListItem>
            viii. Designación del Home Manager para que los copropietarios puedan ponerse en contacto con el Home
            Manager de su propiedad.
          </ListItem>

          <SubHeading>2. Vender total o parcialmente inmuebles de propiedad de los Usuarios a través de Livo</SubHeading>
          <Paragraph>
            Livo ofrece la posibilidad de vender un inmueble completo o parte de este a Livo directamente o a varios de
            los Usuarios interesados en adquirir inmuebles a través de Livo.
          </Paragraph>
          <Paragraph>
            Para lo anterior, Livo cambiará el título de propiedad del inmueble para una sociedad con 8 acciones de las
            cuales el anterior propietario podrá retener el 50%.
          </Paragraph>

          <SubHeading>
            3. Gestionar la administración de los inmuebles de propiedad de los Usuarios a través de Livo
          </SubHeading>
          <Paragraph>
            Livo ofrece el servicio de administración y gestión de los inmuebles y de la relación entre copropietarios.
            Entre los servicios ofrecidos para administración de inmuebles se encuentra la distribución de los costos
            operativos de manera equitativa entre los copropietarios, el pago de facturas, la administración del
            inmueble, los trabajos de mantenimiento de este, la coordinación del servicio de limpieza con posterioridad
            a las estadías, la posibilidad de arrendar el inmueble, la de reservar el tiempo que se quiere disfrutar el
            mismo durante el año y solicitar los servicios de otros proveedores como chef en casa, recogida en
            aeropuerto, entre otros.
          </Paragraph>
          <Paragraph>
            Los Servicios anteriormente descritos serán además gestionados a través del aplicativo móvil de Livo, donde
            se podrá revisar las finanzas, reservar el tiempo, conversar con el Home Manager de la propiedad todos los
            días.
          </Paragraph>

          <Heading>III. Obligaciones</Heading>
          <SubHeading>a) Obligaciones de los Usuarios</SubHeading>
          <Paragraph>
            Con la aceptación de los presentes Términos y Condiciones los Usuarios se obligan a: (1) suministrar
            información veraz y fidedigna al momento de registrarse en la Plataforma o en la App, en caso de aplicar;
            (2) mantener actualizada la información personal brindada a Livo; (3) abstenerse de utilizar los Servicios
            ofrecidos por Livo para realizar actos contrarios a la moral, la ley, el orden público y buenas costumbres
            en contra de Livo o terceras personas; y (4) abstenerse de suplantar la identidad de otros Usuarios.
          </Paragraph>

          <SubHeading>b) Obligaciones del Titular</SubHeading>
          <Paragraph>
            En virtud de los presentes Términos y Condiciones el Titular, se obliga a: (1) poner a disposición de los
            Usuarios los Términos y Condiciones de uso de la Plataforma y la App de forma actualizada; (2) utilizar la
            información y datos personales de los Usuarios para los fines establecidos en los presentes Términos y
            Condiciones y en la Política de Tratamiento de Datos Personales de Livo; (3) garantizar que la información,
            el detalle y las imágenes de los inmuebles descritos en la Plataforma sea verídica y actualizada; (4)
            contactar oportunamente a los Usuarios que lo han solicitado a través de la Plataforma; (6) en general
            todas aquellas conductas necesarias para la ejecución del negocio jurídico.
          </Paragraph>

          <Heading>IV. Consideraciones finales</Heading>

          <SubHeading>I. Definiciones</SubHeading>
          <Paragraph>
            a. Casa Livo: una Casa Livo no es un “tiempo compartido” donde únicamente se posee el derecho de usar la
            propiedad por un período fijo de tiempo en un año, por el contrario, es una propiedad inmobiliaria donde el
            copropietario adquiere parte del capital del inmueble y puede beneficiarse de cualquier apreciación en el
            valor de este inmueble en el tiempo.
          </Paragraph>
          <Paragraph>b. Propiedad “En Vivo”: es un inmueble de propiedad de Livo.</Paragraph>
          <Paragraph>
            c. Propiedad “Prospectos”: un prospecto es una lista completa de inmuebles que Livo considera que tendrá
            demanda en función de su precio, ubicación, estilo y comodidades. Si hay suficiente interés en la casa por
            parte de los Usuarios y/o compradores de Livo, Livo la convertirá en una Casa Livo.
          </Paragraph>
          <Paragraph>
            d. Propiedades “Próximamente”: es un inmueble de propiedad de los socios de Livo, el cual estará
            próximamente disponible para ser una Casa Livo.
          </Paragraph>
          <Paragraph>
            e. Home Manager: gerente de Livo encargado de la programación de los propietarios, la gestión del inmueble
            y problemas relacionados con este.
          </Paragraph>

          <SubHeading>II. Exención de responsabilidad</SubHeading>
          <Paragraph>
            El Titular no garantiza de ningún modo la continuidad y disponibilidad de los contenidos o servicios
            ofrecidos a través de la Plataforma o la App. No obstante, el Titular llevará a cabo las acciones que de
            acuerdo con sus posibilidades le permitan mantener el buen funcionamiento de la Plataforma y la App, sin que
            esto suponga alguna responsabilidad por parte del mismo.
          </Paragraph>
          <Paragraph>
            De igual forma, el Titular no será responsable ni garantizará que el contenido del software al que pueda
            accederse a través de la Plataforma o la App, se encuentren libre de errores, software malicioso o que
            puedan causar algún daño a nivel de software o hardware en el equipo a través del cual el Usuario accede la
            Plataforma o la App, por lo que los Usuarios aceptan que acceden a estos bajo su propio riesgo y
            responsabilidad.
          </Paragraph>
          <Paragraph>
            El Titular tampoco se hace responsable de los daños que pudiesen ocasionarse por un uso inadecuado de la
            Plataforma o la App. En ningún caso el Titular será responsable por las pérdidas, daños o perjuicios de
            cualquier tipo que surjan por el acceso o utilización de la Plataforma o la App.
          </Paragraph>
          <Paragraph>
            El contenido publicado en la Plataforma o en la App, por cualquier medio o formato (texto, video, imágenes,
            etc) cumple con propósitos meramente enunciativos y no constituyen asesoría o consejo sobre cualquiera de
            los temas que traten.
          </Paragraph>

          <SubHeading>III. Capacidad</SubHeading>
          <Paragraph>
            En virtud de las condiciones de capacidad legal establecidas en el Código Civil colombiano y de la validez
            de la manifestación de voluntad a través de medios electrónicos establecida en la Ley 527 de 1999, los
            Usuarios al momento de solicitar la adquisición o venta de los inmuebles, manifiestan expresamente tener
            capacidad para celebrar el tipo de transacciones que se realizarán por medio de la Plataforma o WhatsApp.
          </Paragraph>

          <SubHeading>IV. Legislación aplicable</SubHeading>
          <Paragraph>
            Los presentes Términos y Condiciones se regirán en todos sus efectos por su contenido y por la ley
            colombiana aplicable.
          </Paragraph>

          <SubHeading>V. Aceptación total de los términos</SubHeading>
          <Paragraph>
            El Usuario manifiesta expresamente que ha leído, que entiende y que acepta la totalidad de los Términos y
            Condiciones, por lo que se compromete al cumplimiento total de los deberes, obligaciones y cargas aquí
            estipuladas.
          </Paragraph>

          <SubHeading>VI. Vigencia</SubHeading>
          <Paragraph>
            Los presentes Términos y Condiciones están vigentes a partir de 19 febrero de 2023 y hasta tanto no sean
            modificados y la nueva versión publicada en la Plataforma y la App.
          </Paragraph>
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
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 14,
    marginBottom: 5,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 9,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 16,
    color: '#374151',
    marginBottom: 8,
  },
  listItem: {
    fontSize: 11,
    lineHeight: 16,
    color: '#374151',
    marginBottom: 6,
  },
});

export default TermsAndConditionsScreen;
