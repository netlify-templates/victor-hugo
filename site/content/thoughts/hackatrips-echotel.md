+++
title = "Hackatrips 2018 - Echotel"
subtitle = "Un DAO que ni llegó a tiempo ni se le esperaba"
date = "2018-01-24T07:23:52+01:00"
months = [ "2018-01" ]
authors = [ "josé-san-leandro" ]
authorPhoto = "josé-san-leandro.jpg"
draft = "false"
tags = [ "osoco", "hackatrips", "hackathon", "dao", "blockchain", "ethereum" ]
summary = ""
background = "road-desert.jpg"
backgroundSummary = "road-desert.jpg"
+++

Este pasado fin de semana se ha celebrado la [II Edición de Hackatrips FITUR 2018](http://www.hackatrips.com), esta vez con la temática de innovación en el sector turístico.

De forma imprevista, alguien sugirió volver a participar, recordando que en la primera edición la experiencia fue muy positiva. Intensa, y agotadora, pero positiva.
Así que unos cuantos nos animamos.

Esta vez nos apetecía proponer algo que tuviera que ver con [Blockchain](https://en.wikipedia.org/wiki/Blockchain). Temíamos que, dada la repercusión que esta temática tiene actualmente en los medios, cualquier propuesta de este estilo podría parecer poco original.
También intuíamos que no sería fácil.

Nuestro equipo lo formamos José Canfrán, Adriana Varela, Caridad San Leandro, José San Leandro Ros, y yo. Nuestra idea la llamamos Echotel, y era una propuesta continuísta con la idea que presentamos en el primer Hackatrips: impulsar el turismo sostenible.

En esta ocasión nuestro *target* inicial eran los hoteles. &iquest;Cómo convencerles para impulsar un cambio real en cuanto a ofrecer servicios respetuosos con el medio ambiente y con el desarrollo sostenible?
Buscábamos definir un criterio por el cual los hoteles pudieran optar a certificaciones que denoten su grado de compromiso con el turismo sostenible.

Para ello, nos valimos de la *blockchain* de [Ethereum](https://en.wikipedia.org/wiki/Ethereum), en la cual desplegaríamos un [SmartContract](https://en.wikipedia.org/wiki/Smart_contract) que nos permitiría gestionar la reputación de cada hotel.

Así pues nos propusimos implementar una prueba de concepto lo más simple posible: un buscador de camas. Envolvimos el <abbr title="Application Programming Interface">[API](https://en.wikipedia.org/wiki/Application_programming_interface)</abbr> que nos proporcionaba uno de los patrocinadores del *[hackathon](https://en.wikipedia.org/wiki/Hackathon)*, [HotelsCombined](https://www.hotelscombined.es), para añadirle un dato más a cada resultado que éste nos devolvía: la reputación. A esta puntuación la denominamos *GreenScore*.

La reputación, como hemos dicho, la otorgaba un *contrato inteligente*. Lo implementamos y lo desplegamos sobre una *blockchain* local ([ganache](https://github.com/trufflesuite/ganache)). Asignamos, a modo de prueba, unas reputaciones iniciales para los hoteles que respondía a unos criterios de búsqueda que acordamos previamente. Era un *hackathon*, a fin de cuentas. Con más esfuerzo del esperado, fruto en gran medida de nuestra relativa inexperiencia, conseguimos llamar al contrato desde un servidor [Express](https://expressjs.com) en el que definimos nuestro <abbr title="Application Programming Interface">API</abbr> <abbr title="Representational State Transfer">[REST](https://en.wikipedia.org/wiki/Representational_state_transfer)</abbr> que envolvía el buscador de hoteles. En paralelo también conseguimos tener la <abbr title="Online Travel Agency">OTA</abbr> (agencia de viajes online) y el <abbr title="Application Programming Interface">API</abbr> de Echotel funcionando. Usamos [Apiary](https://apiary.io) para poder trabajar en paralelo y ser más rápidos.

{{< figure src="/images/thoughts/echotel-ota-screenshot.png" >}}

Esquemáticamente, cada búsqueda en la <abbr title="Online Travel Agency">OTA</abbr> origina una serie de acciones.

{{< figure src="/images/thoughts/echotel-ota.png" >}}

El <abbr title="Application Programming Interface">API</abbr> de Echotel actuaría como un *[proxy inverso](https://en.wikipedia.org/wiki/Reverse_proxy)* sobre el <abbr title="Application Programming Interface">API</abbr> de HotelsCombined, al que le añadiría la reputación. En el ejemplo, los resultados que proporciona HotelsCombined son los hoteles **h1** y **h2**. La ejecución de la función de lectura de *GreenScore* devuelve **7** y **4**, respectivamente. Finalmente, la <abbr title="Online Travel Agency">OTA</abbr> se encargaría de ordenar los hoteles en función de la reputación, por lo que se mostraría **h1** en primer lugar.

{{< figure src="/images/thoughts/echotel-ota-results-screenshot.png" >}}

Posteriormente diseñamos un prototipo de lo que sería la herramienta para certificar las características de cada hotel en lo referente a criterios de sostenibilidad. La denominamos **CERTIFY**.

{{< figure src="/images/thoughts/echotel-certify-screenshot.png" >}}

La entidad certificadora necesitaría poder evaluar las características de un hotel y su relevancia en cuanto a su compromiso por la sostenibilidad. Para ello, añadimos la función correspondiente en el contrato, y así poder ejecutarla desde el propio servidor Express donde estaba desplegada la aplicación. Así podríamos demostrar una de las características más atractivas para los hoteles: comprobar el <abbr title="Return on Investment">[ROI](https://en.wikipedia.org/wiki/Return_on_investment)</abbr> de la propuesta tan rápido como sea posible. En cuanto un hotel llevara a cabo acciones que redundaran en mejorar el turismo sostenible, instantáneamente vería cómo su posición en nuestro <abbr title="Search Engine Results Page">[SERP](https://en.wikipedia.org/wiki/Search_engine_results_page)</abbr> mejoraría. No tendría que esperar semanas ni meses para comprobarlo.

En el ejemplo anterior, una nueva valoración de **h2** le asignaría una reputación de **9**, y como resultado aparecería inmediatamente por delante de **h1** en la página de resultados.

{{< figure src="/images/thoughts/echotel-certify.png" >}}

Llegados a este punto, queríamos incentivar a los turistas para llevar a cabo acciones relevantes en el destino. Como ejemplos, pensamos en repoblar bosques o realizar actividades solidarias. Imaginamos acuerdos con <abbr title="Organizaciones no gubernamentales">ONG</abbr>s, y desarrollamos una prueba de concepto que sirviera para ilustrar un momento representativo en el cual el turista recibiera una acreditación por haber realizado una acción concreta, corroborada por alguna <abbr title="Organizaciones no gubernamentales">ONG</abbr> comprometida con la iniciativa.

La mejor forma de implementar esta forma de gamificación era un *token* [ERC20](https://en.wikipedia.org/wiki/ERC20). Así, podríamos cerrar el ciclo y usarlo para canjear descuentos al reservar una estancia usando el buscador.

La propuesta de valor tenía dos destinatarios. Por un lado, los hoteles, que tendrían la oportunidad de apostar por el turismo sostenible y así captar turistas comprometidos, y previsiblemente más atractivos para el hotel. Por otro lado, los turistas tendrían mecanismos para realizar acciones beneficiosas en el destino, y que les incentivaría económicamente.

Sólo necesitábamos implementar el *token*. Sin embargo, desde la organización se instó a que "no hiciéramos una nueva criptomoneda". Eso nos creó cierta confusión y frustración inicial. No es habitual un condicionamiento tan explícito sobre qué ideas llevar a cabo y cuáles no.

En cualquier caso, el tiempo para implementar lo que queríamos hacer era muy limitado, y decidimos enfocarlo a cómo podríamos implementar un <abbr title="Decentralized Autonomous Organization">[DAO](https://en.wikipedia.org/wiki/Decentralized_autonomous_organization)</abbr> relacionado con esta propuesta.

Eso es lo que intentamos explicar en la presentación. Desafortunadamente, no lo conseguimos. Afortunadamente, éramos conscientes de lo arriesgado de la propuesta y nos sentimos satisfechos con el trabajo realizado.

De haber dado tiempo, nuestra idea habría incluido un *crawler* de servicios de hostelería. Por cada hotel encontrado, lo evaluaríamos en cuanto a sostenibilidad utilizando un algoritmo o IA. Si no superase cierto umbral, comunicaríamos al hotel nuestras recomendaciones personalizadas para mejorar en este sentido. Si por el contrario su calificación fuera positiva, se le invitaría a contribuir a nuestra iniciativa con una donación en criptomonedas, lo que a su vez le permitiría recibir tráfico de nuestro buscador, y recíprocamente nosotros recibir ingresos por afiliación.

{{< figure src="/images/thoughts/echotel-crawler.png" >}}

Dicho *crawler* lo desplegaríamos en alguno de los servicios de *hosting* que ya soportan pago por criptomonedas. Podríamos hacer que el rastreador se regulase en función de sus propios fondos disponibles, teniendo en cuenta el coste de ejecutar *SmartContracts* y el coste de su propio *hosting*.

Como conclusión, no hay duda de que para nosotros ha sido un *hackathon* muy intenso, con algunos imprevistos, en el que esperábamos haber podido llegar más lejos en todos los sentidos: tanto en cuanto al alcance de la solución, como respecto a la valoración del jurado. Una gran experiencia que repetiremos con total seguridad.
