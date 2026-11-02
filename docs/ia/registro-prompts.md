# Registro de uso de inteligencia artificial

Herramienta: Claude Code, modelo Claude Opus 5.5.

## Sesión 1 - 2026-11-01: análisis de la consigna y selección del sistema base

| # | Prompt | Finalidad | Intervención de la IA | Decisión del estudiante |
|---|---|---|---|---|
| 1 | "tengo que resolver un TPI que se encuentra en este directorio. Lo voy a resolver de forma individual y con las fuentes que se encuentran en este directorio. quiero que analices @"TPI/TP MS2V2.pdf" , la forma de entrega y cómo podemos preparar la estrategia general para la entrega" | Comprender la consigna | Resumió requisitos, riesgos y una estrategia | Entrega individual |
| 2 | "la fecha de entrega está prevista para el 8 de noviembre, mi comision es 4, la propuesta de como debe ser la entrega está en /home/facundowork/Escritorio/TUP/MS 2/TPI/modelo presentar tp ms2 . estoy averiguando de donde tengo que hacer esa justificacion. podemos utilizar un repositorio existente para hacer lo que se pide en este TPI? o sea, tomar de ejemplo un repositorio muy conocido de codigo abierto, clonarlo y utilizarlo?" | Revisar alternativas de sistema base | Analizó la admisibilidad y propuso un calendario | Evaluar un repositorio existente |
| 3 | "como podría hacer la busqueda sobre github, que no sea un proyecto muy grande y que pueda detactar estos refactos, code review, etc?" | Definir criterios de búsqueda | Propuso filtros y comandos de evaluación | Búsqueda y selección del candidato |
| 4 | "busqué uno y quiero que me des tu opinion sobre este: https://github.com/anthropics/claude-quickstarts/tree/main/customer-support-agent" | Evaluar el candidato | Inspeccionó código y métricas; opinó en contra | Continuar el análisis |
| 5 | "pero el TPI no pide correr el proyecto, sólo está pidiendo la refactorizacion del mismo, no hace falta que tenga al api key de antropic. tambien una vez clonado el repo, podriamos modificarlo un poco para el fin que se pide en el TPI" | Revisar alternativas | Corrigió su opinión y propuso pruebas con stubs y un módulo de incidencias | Usar este proyecto |
| 6 | "dale, armemos el repo con este proyecto. no necesito la aprobacion de la catedra" | Preparar el repositorio | Importó el código, creó el tag `upstream-original` y estos documentos | Decidió usar el proyecto sin consulta previa a la cátedra |
