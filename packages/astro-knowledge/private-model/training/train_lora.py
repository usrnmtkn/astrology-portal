#!/usr/bin/env python3
"""Private LoRA training entrypoint for TLDR Astro sky articles."""

import argparse
import json
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, Mxfp4Config
from trl import SFTConfig, SFTTrainer


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    return parser.parse_args()


def load_config(path):
    config_path = Path(path).resolve()
    with config_path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)
    return config_path, config


def resolve_from_private_model_root(config_path, value):
    private_model_root = config_path.parent.parent
    return (private_model_root / value).resolve()


def main():
    args = parse_args()
    config_path, config = load_config(args.config)
    dataset_dir = resolve_from_private_model_root(config_path, config["dataset_dir"])
    train_path = dataset_dir / config["train_file"]
    eval_path = dataset_dir / config["eval_file"]
    output_dir = resolve_from_private_model_root(config_path, config["output_dir"])

    dataset = load_dataset(
        "json",
        data_files={"train": str(train_path), "eval": str(eval_path)},
    )
    minimum = int(config["minimum_train_examples"])
    if len(dataset["train"]) < minimum:
        raise RuntimeError(
            f"Refusing to train on {len(dataset['train'])} examples; "
            f"the configured minimum is {minimum}."
        )
    if len(dataset["eval"]) == 0:
        raise RuntimeError("Refusing to train without a held-out evaluation set.")

    tokenizer = AutoTokenizer.from_pretrained(config["base_model"])
    quantization_config = Mxfp4Config(dequantize=True)
    model = AutoModelForCausalLM.from_pretrained(
        config["base_model"],
        attn_implementation="eager",
        torch_dtype=torch.bfloat16,
        quantization_config=quantization_config,
        use_cache=False,
        device_map="auto",
    )

    peft_config = LoraConfig(
        r=int(config["lora_rank"]),
        lora_alpha=int(config["lora_alpha"]),
        target_modules="all-linear",
        target_parameters=[
            "7.mlp.experts.gate_up_proj",
            "7.mlp.experts.down_proj",
            "15.mlp.experts.gate_up_proj",
            "15.mlp.experts.down_proj",
            "23.mlp.experts.gate_up_proj",
            "23.mlp.experts.down_proj",
        ],
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    training_args = SFTConfig(
        output_dir=str(output_dir),
        learning_rate=float(config["learning_rate"]),
        gradient_checkpointing=True,
        num_train_epochs=float(config["num_train_epochs"]),
        logging_steps=1,
        eval_strategy="epoch",
        save_strategy="epoch",
        per_device_train_batch_size=int(config["per_device_train_batch_size"]),
        per_device_eval_batch_size=int(config["per_device_eval_batch_size"]),
        gradient_accumulation_steps=int(config["gradient_accumulation_steps"]),
        max_length=int(config["max_length"]),
        warmup_ratio=float(config["warmup_ratio"]),
        lr_scheduler_type="cosine_with_min_lr",
        lr_scheduler_kwargs={"min_lr_rate": 0.1},
        seed=int(config["seed"]),
        report_to=config["report_to"],
        push_to_hub=bool(config["push_to_hub"]),
    )
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["eval"],
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.save_model(str(output_dir))


if __name__ == "__main__":
    main()
