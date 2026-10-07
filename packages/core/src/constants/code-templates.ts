/** Ready code components component_template_insert writes, each a React file with property controls and springs. */
export const CODE_TEMPLATES = {
  accordion: {
    file: "Accordion.tsx",
    about: "Questions that open one at a time, height animated with a spring; text and colors as controls.",
    code: `import { addPropertyControls, ControlType } from "framer"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

const SPRING = { type: "spring", stiffness: 400, damping: 40, mass: 1 }

export default function Accordion({ items, color, line, font }) {
    const [open, setOpen] = useState<number | null>(null)

    return (
        <div style={{ width: "100%", color, ...font }}>
            {items.map((item, index) => (
                <div key={index} style={{ borderBottom: \`1px solid \${line}\` }}>
                    <button
                        onClick={() => setOpen(open === index ? null : index)}
                        aria-expanded={open === index}
                        style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", width: "100%", padding: "20px 0" }}
                    >
                        <span>{item.question}</span>
                        <motion.span animate={{ rotate: open === index ? 45 : 0 }} transition={SPRING}>+</motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                        {open === index && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} style={{ overflow: "hidden" }}>
                                <p style={{ margin: 0, paddingBottom: 20, opacity: 0.75 }}>{item.answer}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    )
}

Accordion.defaultProps = { items: [{ question: "Question", answer: "Answer" }], color: "#111", line: "rgba(0,0,0,0.12)" }

addPropertyControls(Accordion, {
    items: { type: ControlType.Array, control: { type: ControlType.Object, controls: { question: { type: ControlType.String }, answer: { type: ControlType.String, displayTextArea: true } } } },
    color: { type: ControlType.Color },
    line: { type: ControlType.Color },
    font: { type: ControlType.Font, controls: "extended" },
})
`,
  },
  tabs: {
    file: "Tabs.tsx",
    about: "Tabs with a sliding indicator on a spring; tab names and panel texts as controls.",
    code: `import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import { useState } from "react"

const SPRING = { type: "spring", stiffness: 400, damping: 40, mass: 1 }

export default function Tabs({ tabs, color, accent, font }) {
    const [active, setActive] = useState(0)

    return (
        <div style={{ width: "100%", color, ...font }}>
            <div role="tablist" style={{ display: "flex", gap: 24, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
                {tabs.map((tab, index) => (
                    <button key={index} role="tab" aria-selected={active === index} onClick={() => setActive(index)} style={{ all: "unset", cursor: "pointer", position: "relative", padding: "12px 0", opacity: active === index ? 1 : 0.6 }}>
                        {tab.title}
                        {active === index && <motion.div layoutId="tab-indicator" transition={SPRING} style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: accent }} />}
                    </button>
                ))}
            </div>
            <div role="tabpanel" style={{ paddingTop: 24 }}>{tabs[active]?.text}</div>
        </div>
    )
}

Tabs.defaultProps = { tabs: [{ title: "First", text: "First panel" }, { title: "Second", text: "Second panel" }], color: "#111", accent: "#111" }

addPropertyControls(Tabs, {
    tabs: { type: ControlType.Array, control: { type: ControlType.Object, controls: { title: { type: ControlType.String }, text: { type: ControlType.String, displayTextArea: true } } } },
    color: { type: ControlType.Color },
    accent: { type: ControlType.Color },
    font: { type: ControlType.Font, controls: "extended" },
})
`,
  },
  countdown: {
    file: "Countdown.tsx",
    about: "Days, hours, minutes and seconds to a date, in tabular figures; the date and labels as controls.",
    code: `import { addPropertyControls, ControlType } from "framer"
import { useEffect, useState } from "react"

function left(target: number) {
    const ms = Math.max(0, target - Date.now())

    return [Math.floor(ms / 86400000), Math.floor(ms / 3600000) % 24, Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60]
}

export default function Countdown({ date, labels, color, font }) {
    const target = new Date(date).getTime()
    const [parts, setParts] = useState<number[] | null>(null)

    useEffect(() => {
        setParts(left(target))
        const timer = setInterval(() => setParts(left(target)), 1000)

        return () => clearInterval(timer)
    }, [target])

    return (
        <div style={{ display: "flex", gap: 24, color, fontVariantNumeric: "tabular-nums", ...font }}>
            {(parts ?? [0, 0, 0, 0]).map((value, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "2em" }}>{String(value).padStart(2, "0")}</span>
                    <span style={{ opacity: 0.6 }}>{labels.split(",")[index]?.trim()}</span>
                </div>
            ))}
        </div>
    )
}

Countdown.defaultProps = { date: "2027-01-01T00:00:00", labels: "Days, Hours, Minutes, Seconds", color: "#111" }

addPropertyControls(Countdown, {
    date: { type: ControlType.String, description: "ISO date, e.g. 2027-01-01T00:00:00" },
    labels: { type: ControlType.String },
    color: { type: ControlType.Color },
    font: { type: ControlType.Font, controls: "extended" },
})
`,
  },
  marquee: {
    file: "Marquee.tsx",
    about:
      "Words or logos scrolling in a loop at a steady speed, paused for reduced motion; items and speed as controls.",
    code: `import { addPropertyControls, ControlType } from "framer"
import { motion, useReducedMotion } from "framer-motion"

export default function Marquee({ items, speed, gap, color, font }) {
    const still = useReducedMotion()
    const row = items.map((item, index) => <span key={index} style={{ whiteSpace: "nowrap" }}>{item}</span>)

    return (
        <div style={{ width: "100%", overflow: "hidden", color, ...font }}>
            <motion.div
                style={{ display: "flex", gap, width: "max-content" }}
                animate={still ? undefined : { x: ["0%", "-50%"] }}
                transition={{ duration: Math.max(4, 200 / speed), ease: "linear", repeat: Infinity }}
            >
                {row}
                {row}
            </motion.div>
        </div>
    )
}

Marquee.defaultProps = { items: ["First", "Second", "Third"], speed: 20, gap: 48, color: "#111" }

addPropertyControls(Marquee, {
    items: { type: ControlType.Array, control: { type: ControlType.String } },
    speed: { type: ControlType.Number, min: 1, max: 100 },
    gap: { type: ControlType.Number, min: 0, max: 200 },
    color: { type: ControlType.Color },
    font: { type: ControlType.Font, controls: "extended" },
})
`,
  },
  scrollProgress: {
    file: "ScrollProgress.tsx",
    about: "A bar along the top that fills as the page scrolls, smoothed by a spring; color and height as controls.",
    code: `import { addPropertyControls, ControlType } from "framer"
import { motion, useScroll, useSpring } from "framer-motion"

export default function ScrollProgress({ color, height }) {
    const { scrollYProgress } = useScroll()
    const scaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 40, mass: 1 })

    return <motion.div style={{ width: "100%", height, background: color, transformOrigin: "0% 50%", scaleX }} />
}

ScrollProgress.defaultProps = { color: "#111", height: 3 }

addPropertyControls(ScrollProgress, {
    color: { type: ControlType.Color },
    height: { type: ControlType.Number, min: 1, max: 12 },
})
`,
  },
} as const;

export type CodeTemplateName = keyof typeof CODE_TEMPLATES;
