"use client";

import {
  Award,
  CalendarCheck2,
  ChevronDown,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { ComponentType, useState } from "react";

import BackToHomeButton from "@/components/BackToHomeButton";
import ListenButton from "@/components/ListenButton";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";

type TopicId = "separar" | "reglas" | "puntos" | "privacidad";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface TopicSpec {
  id: TopicId;
  title: string;
  shortDesc: string;
  Icon: ComponentType<{ className?: string }>;
  activeClass: string;
  idleClass: string;
  questions: FaqItem[];
}

const TOPICS: TopicSpec[] = [
  {
    id: "separar",
    title: "Separar residuos",
    shortDesc: "Qué va a la huerta y qué va a reciclaje.",
    Icon: Leaf,
    activeClass: "border-huerta-700 bg-huerta-600 text-white shadow-md",
    idleClass: "border-huerta-400 bg-white text-gray-900 hover:bg-huerta-50",
    questions: [
      {
        id: "sep-1",
        question: "¿Qué residuos orgánicos reciben los huerteros?",
        answer:
          "Cáscaras crudas de frutas y verduras, borra de café, cáscaras de huevo y hojas secas en un balde aparte.",
      },
      {
        id: "sep-2",
        question: "¿Qué residuos reciclables reciben los recicladores?",
        answer:
          "Botellas plásticas, cajas de cartón secas, papel, cuadernos, latas y frascos de vidrio limpios y secos.",
      },
      {
        id: "sep-3",
        question: "¿Qué cosas NO se entregan en EcoConecta?",
        answer:
          "Papel higiénico, pañales, servilletas con grasa, carnes cocidas y aceite quemado. Eso va al camión de aseo.",
      },
    ],
  },
  {
    id: "reglas",
    title: "Reglas de entrega",
    shortDesc: "Cómo pedir por WhatsApp y acordar la cita.",
    Icon: CalendarCheck2,
    activeClass: "border-reciclaje-700 bg-reciclaje-600 text-white shadow-md",
    idleClass:
      "border-reciclaje-400 bg-white text-gray-900 hover:bg-reciclaje-50",
    questions: [
      {
        id: "reg-1",
        question: "¿Cómo pido una recolección desde mi celular?",
        answer:
          "Toca el botón verde de WhatsApp y envía un mensaje de texto o una nota de voz con tu dirección y tipo de residuo.",
      },
      {
        id: "reg-2",
        question: "¿Puedo mandar una nota de voz en vez de escribir?",
        answer:
          "Sí. Solo habla normal en tu WhatsApp; EcoConecta convierte tu audio a texto y lo envía al coordinador correcto.",
      },
      {
        id: "reg-3",
        question: "¿Quién acuerda conmigo el día y la hora?",
        answer:
          "El coordinador de huerteros (orgánicos) o de recicladores (reciclables) te confirma por WhatsApp tu código y horario.",
      },
      {
        id: "reg-4",
        question: "¿Qué pasa si mezclé o se clasificó mal mi pedido?",
        answer:
          "No te preocupes. El coordinador puede mover tu pedido al colectivo correcto y te avisará por WhatsApp.",
      },
    ],
  },
  {
    id: "puntos",
    title: "Puntos y premios",
    shortDesc: "Cómo ganas puntos por kilos o libras.",
    Icon: Award,
    activeClass: "border-sol-600 bg-sol-400 text-gray-900 shadow-md",
    idleClass: "border-sol-400 bg-white text-gray-900 hover:bg-sol-50",
    questions: [
      {
        id: "pts-1",
        question: "¿Cuántos puntos gano por cada entrega?",
        answer:
          "Por cada kilogramo ganas 1 punto y por cada libra ganas medio punto (0.5), tanto para tu hogar como para el recolector.",
      },
      {
        id: "pts-2",
        question: "¿Qué premios puedo reclamar con mis puntos?",
        answer:
          "Al llegar a 10 puntos reclamas abono de huerta (Semilla), con 25 puntos nivel Brote y con 50 puntos canasta nivel Árbol.",
      },
      {
        id: "pts-3",
        question: "¿Dónde veo mis puntos acumulados?",
        answer:
          "Te avisamos por WhatsApp después de cada entrega y también puedes ver tu saldo entrando en Mi Cuenta.",
      },
    ],
  },
  {
    id: "privacidad",
    title: "Privacidad",
    shortDesc: "Cómo cuidamos tu teléfono y tu dirección.",
    Icon: ShieldCheck,
    activeClass: "border-gray-900 bg-gray-900 text-white shadow-md",
    idleClass: "border-stone-400 bg-white text-gray-900 hover:bg-stone-100",
    questions: [
      {
        id: "pri-1",
        question: "¿Quién puede ver mi teléfono y dirección?",
        answer:
          "Únicamente el coordinador del colectivo que atiende tu entrega. Tus datos nunca aparecen públicos en internet.",
      },
      {
        id: "pri-2",
        question: "¿Me escribirán personas desconocidas?",
        answer:
          "No. Toda la coordinación de horario se hace solo a través del coordinador oficial del colectivo por WhatsApp.",
      },
      {
        id: "pri-3",
        question: "¿Qué pasa si es la primera vez que escribo?",
        answer:
          "Guardamos tu nombre de WhatsApp y tu número para que el coordinador confirme tu dirección contigo de forma segura.",
      },
    ],
  },
];

export default function AyudaPage() {
  const [activeTopicId, setActiveTopicId] = useState<TopicId>("separar");
  const [openQuestionId, setOpenQuestionId] = useState<string | null>("sep-1");

  const activeTopic =
    TOPICS.find((t) => t.id === activeTopicId) ?? TOPICS[0];

  const handleSelectTopic = (topic: TopicSpec) => {
    setActiveTopicId(topic.id);
    // Abrir solo la primera pregunta del nuevo tema para evitar saturación
    setOpenQuestionId(topic.questions[0]?.id ?? null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <BackToHomeButton href="/" label="Volver al inicio" />

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
          Ayuda y Reglas
        </h1>
        <p className="text-lg text-gray-800">
          Toca un tema para ver sus preguntas y escuchar las respuestas.
        </p>
      </div>

      {/* 4 BOTONES GRANDES DE TEMAS (estilo Cataki Dúvidas, máx. 2 columnas) */}
      <div
        role="tablist"
        aria-label="Temas de ayuda"
        className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        {TOPICS.map((topic) => {
          const Icon = topic.Icon;
          const isSelected = topic.id === activeTopicId;
          return (
            <button
              key={topic.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelectTopic(topic)}
              className={`flex min-h-[84px] items-center gap-4 rounded-2xl border-2 p-6 text-left transition active:scale-[0.99] ${
                isSelected ? topic.activeClass : topic.idleClass
              }`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  isSelected
                    ? "bg-white/20 text-current"
                    : "bg-stone-100 text-gray-900"
                }`}
              >
                <Icon className="h-8 w-8" />
              </span>
              <div>
                <span className="block text-xl font-black">{topic.title}</span>
                <span
                  className={`mt-0.5 block text-base font-medium ${
                    isSelected ? "opacity-95" : "text-gray-700"
                  }`}
                >
                  {topic.shortDesc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* PREGUNTAS DEL TEMA SELECCIONADO (acordeón grande, solo 1 abierta a la vez) */}
      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-black text-gray-900">
          Preguntas sobre {activeTopic.title.toLowerCase()}
        </h2>

        <div className="space-y-4">
          {activeTopic.questions.map((item) => {
            const isOpen = openQuestionId === item.id;
            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition ${
                  isOpen ? "border-huerta-600" : "border-stone-200"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenQuestionId(isOpen ? null : item.id)
                  }
                  className="flex min-h-[68px] w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-stone-50"
                >
                  <span className="text-xl font-extrabold text-gray-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-7 w-7 shrink-0 text-gray-900 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-5 border-t-2 border-stone-100 bg-stone-50 px-6 py-6">
                    <p className="text-lg leading-relaxed text-gray-900">
                      {item.answer}
                    </p>
                    <div>
                      <ListenButton
                        variant="accent"
                        label="Escuchar respuesta"
                        text={`${item.question} ${item.answer}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Nota institucional RN-06 + botón grande WhatsApp */}
      <div className="mt-10 space-y-6">
        <div className="rounded-2xl border-2 border-sol-400 bg-sol-50 p-5 text-base font-semibold text-gray-900">
          <strong>Nota sobre puntos (RN-06):</strong> Valores de puntaje y
          beneficios referenciales y parametrizables; sujetos a validación
          oficial de la Fundación Santo Domingo.
        </div>

        <WhatsAppCtaButton
          label="Pedir Recolección por WhatsApp"
          size="xl"
          className="w-full"
        />
      </div>
    </div>
  );
}
