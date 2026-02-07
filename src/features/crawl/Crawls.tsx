import React from "react"
import { useParams } from "react-router"

export function Crawls() {
    const { id } = useParams<{ id: string; }>()

    return (
        <>
        </>
    )
}